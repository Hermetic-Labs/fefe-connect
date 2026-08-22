# FEFE Connect identity tenant inventory

**Recorded:** 2026-08-22

## FEFE customer tenant

| Field | Value |
|---|---|
| Display name | FEFE Connect |
| Tenant type | Microsoft Entra External ID |
| Tenant ID | `0fc4c7bc-5996-4bd7-b9b1-efc085356de0` |
| Initial domain | `fefeconnect.onmicrosoft.com` |
| Country/region | United States |
| Azure subscription | Azure subscription 1 (`d1a68ed7-2983-4a86-ab0e-e56df9e2e325`) |
| Resource group | `rg-fefeconnect-prod-eastus` |
| Current gate | Founding administrator MFA-method enrollment required |

This is the customer identity boundary for public FEFE sign-up and sign-in. SPA and protected API registrations must be created here after the founding administrator completes the Microsoft verification-method enrollment.

## Hermetic Labs workforce tenant

| Field | Value |
|---|---|
| Display name | Hermetic Labs |
| Tenant type | Workforce |
| Tenant ID | `bb1b06c5-1b43-4295-8c01-d7ffd3a5b366` |
| Primary domain | `7Hermeticlabs.com` |

This tenant owns the Azure subscription and operator identity. It is not the public FEFE customer directory.

## WBG workforce tenant

| Field | Value |
|---|---|
| Display name | WBG |
| Tenant type | Workforce |
| Tenant ID | `31a2fec0-266b-4c67-b56e-2796d8f59c36` |
| Domain | `worldbankgroup.onmicrosoft.com` |

The WBG directory is unrelated to FEFE. No settings, memberships, applications, or permissions were changed. Its presence should be reviewed separately with the account owner before any leave-directory or access-removal action is considered.
