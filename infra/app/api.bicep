targetScope = 'resourceGroup'

param name string
param location string = resourceGroup().location
param tags object = {}
param applicationInsightsName string
param appServicePlanId string
param storageAccountName string
param deploymentStorageContainerName string
param identityId string
param identityClientId string
param keyVaultUri string
param siteOrigin string
param entraIssuer string = ''
param entraJwksUri string = ''
param entraApiAudience string = ''
param serviceName string = 'api'

var applicationInsightsIdentity = 'ClientId=${identityClientId};Authorization=AAD'

resource storageAccount 'Microsoft.Storage/storageAccounts@2023-05-01' existing = {
  name: storageAccountName
}

resource applicationInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: applicationInsightsName
}

var appSettings = {
  AzureWebJobsStorage__blobServiceUri: storageAccount.properties.primaryEndpoints.blob
  AzureWebJobsStorage__tableServiceUri: storageAccount.properties.primaryEndpoints.table
  AzureWebJobsStorage__credential: 'managedidentity'
  AzureWebJobsStorage__clientId: identityClientId
  APPLICATION_STORAGE__tableServiceUri: storageAccount.properties.primaryEndpoints.table
  APPLICATION_STORAGE__credential: 'managedidentity'
  APPLICATION_STORAGE__clientId: identityClientId
  APPLICATIONINSIGHTS_AUTHENTICATION_STRING: applicationInsightsIdentity
  APPLICATIONINSIGHTS_CONNECTION_STRING: applicationInsights.properties.ConnectionString
  AZURE_CLIENT_ID: identityClientId
  AZURE_FUNCTIONS_ENVIRONMENT: 'Production'
  FEFE_SITE_ORIGIN: siteOrigin
  KEY_VAULT_URI: keyVaultUri
  ENTRA_ISSUER: entraIssuer
  ENTRA_JWKS_URI: entraJwksUri
  ENTRA_API_AUDIENCE: entraApiAudience
  ENTRA_REQUIRED_SCOPE: 'access_as_user'
  STRIPE_SECRET_NAME: 'stripe-test-secret-key'
  STRIPE_WEBHOOK_SECRET_NAME: 'stripe-test-webhook-secret'
  STRIPE_API_VERSION: '2026-07-29.dahlia'
  STRIPE_PRICE_INDIVIDUAL_MONTHLY: 'price_1U6jxsRzK8KdcdCbvtQTPHOo'
  STRIPE_PRICE_ORGANIZATION_MONTHLY: 'price_1U6jyQRzK8KdcdCbAeHfPCTH'
  STRIPE_PRICE_ADDITIONAL_SEAT_MONTHLY: 'price_1U6jz1RzK8KdcdCbpB8xCsBj'
  STRIPE_PORTAL_CONFIGURATION_ID: 'bpc_1U6k1bRzK8KdcdCbkG0JtMUW'
  BILLING_DISCLOSURE_VERSION: '2026-08-20'
}

module api 'br/public:avm/res/web/site:0.15.1' = {
  name: '${serviceName}-flex-consumption'
  params: {
    kind: 'functionapp,linux'
    name: name
    location: location
    tags: union(tags, { 'azd-service-name': serviceName })
    serverFarmResourceId: appServicePlanId
    managedIdentities: {
      systemAssigned: false
      userAssignedResourceIds: [identityId]
    }
    functionAppConfig: {
      deployment: {
        storage: {
          type: 'blobContainer'
          value: '${storageAccount.properties.primaryEndpoints.blob}${deploymentStorageContainerName}'
          authentication: {
            type: 'UserAssignedIdentity'
            userAssignedIdentityResourceId: identityId
          }
        }
      }
      scaleAndConcurrency: {
        instanceMemoryMB: 2048
        maximumInstanceCount: 20
      }
      runtime: {
        name: 'node'
        version: '24'
      }
    }
    httpsOnly: true
    publicNetworkAccess: 'Enabled'
    siteConfig: {
      alwaysOn: false
      ftpsState: 'Disabled'
      http20Enabled: true
      minTlsVersion: '1.2'
      cors: {
        allowedOrigins: [siteOrigin]
        supportCredentials: false
      }
    }
    appSettingsKeyValuePairs: appSettings
  }
}

output SERVICE_API_NAME string = api.outputs.name
