targetScope = 'subscription'

@minLength(1)
@maxLength(32)
@description('AZD environment name used to generate unique resource names.')
param environmentName string

@allowed(['eastus'])
@description('Approved Azure region for FEFE Connect.')
param location string = 'eastus'

@description('Object ID of the deployment operator for least-privilege data-plane access.')
param principalId string = deployer().objectId

@description('Resource ID of the existing East US Log Analytics workspace.')
param existingLogAnalyticsWorkspaceId string

@description('Expected Entra v2 token issuer. Empty keeps protected endpoints fail-closed.')
param entraIssuer string = ''

@description('Entra JSON Web Key Set endpoint. Empty keeps protected endpoints fail-closed.')
param entraJwksUri string = ''

@description('Entra API application audience/client ID. Empty keeps protected endpoints fail-closed.')
param entraApiAudience string = ''

var abbrs = loadJsonContent('./abbreviations.json')
var resourceToken = toLower(uniqueString(subscription().id, environmentName, location))
var tags = {
  'azd-env-name': environmentName
  application: 'FEFE Connect'
  environment: 'production'
  owner: 'Elevated Perspectives Psychotherapy LLC'
  'managed-by': 'azd'
}
var resourceGroupName = 'rg-fefeconnect-prod-eastus'
var functionAppName = '${abbrs.webSitesFunctions}fefe-${take(resourceToken, 8)}'
var storageAccountName = '${abbrs.storageStorageAccounts}fefe${take(resourceToken, 12)}'
var deploymentStorageContainerName = 'app-package-${take(resourceToken, 12)}'
var keyVaultName = '${abbrs.keyVaultVaults}fefe-${take(resourceToken, 12)}'

resource rg 'Microsoft.Resources/resourceGroups@2023-07-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module apiIdentity 'br/public:avm/res/managed-identity/user-assigned-identity:0.4.1' = {
  name: 'api-identity'
  scope: rg
  params: {
    name: '${abbrs.managedIdentityUserAssignedIdentities}fefe-${take(resourceToken, 8)}'
    location: location
    tags: tags
  }
}

module functionPlan 'br/public:avm/res/web/serverfarm:0.1.1' = {
  name: 'function-plan'
  scope: rg
  params: {
    name: '${abbrs.webServerFarms}fefe-${take(resourceToken, 8)}'
    location: location
    tags: tags
    sku: {
      name: 'FC1'
      tier: 'FlexConsumption'
    }
    reserved: true
  }
}

module storage 'br/public:avm/res/storage/storage-account:0.8.3' = {
  name: 'storage'
  scope: rg
  params: {
    name: storageAccountName
    location: location
    tags: tags
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    dnsEndpointType: 'Standard'
    publicNetworkAccess: 'Enabled'
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
    minimumTlsVersion: 'TLS1_2'
    blobServices: {
      containers: [
        {
          name: deploymentStorageContainerName
          publicAccess: 'None'
        }
        {
          name: 'profile-images'
          publicAccess: 'None'
        }
        {
          name: 'verification-evidence'
          publicAccess: 'None'
        }
        {
          name: 'upload-quarantine'
          publicAccess: 'None'
        }
      ]
    }
  }
}

module tables './app/tables.bicep' = {
  name: 'application-tables'
  scope: rg
  params: {
    storageAccountName: storage.outputs.name
  }
}

module monitoring 'br/public:avm/res/insights/component:0.6.0' = {
  name: 'application-insights'
  scope: rg
  params: {
    name: '${abbrs.insightsComponents}fefe-${take(resourceToken, 8)}'
    location: location
    tags: tags
    workspaceResourceId: existingLogAnalyticsWorkspaceId
    disableLocalAuth: true
  }
}

module keyVault './app/key-vault.bicep' = {
  name: 'key-vault'
  scope: rg
  params: {
    name: keyVaultName
    location: location
    tags: tags
    managedIdentityPrincipalId: apiIdentity.outputs.principalId
    deployerPrincipalId: principalId
  }
}

module rbac './app/rbac.bicep' = {
  name: 'storage-monitoring-rbac'
  scope: rg
  params: {
    storageAccountName: storage.outputs.name
    appInsightsName: monitoring.outputs.name
    managedIdentityPrincipalId: apiIdentity.outputs.principalId
    userIdentityPrincipalId: principalId
  }
}

module api './app/api.bicep' = {
  name: 'api'
  scope: rg
  params: {
    name: functionAppName
    location: location
    tags: tags
    applicationInsightsName: monitoring.outputs.name
    appServicePlanId: functionPlan.outputs.resourceId
    storageAccountName: storage.outputs.name
    deploymentStorageContainerName: deploymentStorageContainerName
    identityId: apiIdentity.outputs.resourceId
    identityClientId: apiIdentity.outputs.clientId
    keyVaultUri: keyVault.outputs.vaultUri
    siteOrigin: 'https://fefeconnect.com'
    entraIssuer: entraIssuer
    entraJwksUri: entraJwksUri
    entraApiAudience: entraApiAudience
  }
  dependsOn: [
    rbac
    tables
  ]
}

output AZURE_LOCATION string = location
output AZURE_RESOURCE_GROUP string = rg.name
output AZURE_TENANT_ID string = tenant().tenantId
output AZURE_KEY_VAULT_NAME string = keyVault.outputs.name
output SERVICE_API_NAME string = api.outputs.SERVICE_API_NAME
output API_URL string = 'https://${api.outputs.SERVICE_API_NAME}.azurewebsites.net/api'
