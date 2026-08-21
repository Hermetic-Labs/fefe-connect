# FEFE Connect

**Firms & Experts, Fully Evaluated.**

FEFE Connect is a private network for legal and mental-health professionals. The planned service checks selected professional-record facts against identified sources before publishing a membership profile. This repository contains the no-build static website and a working front-end preview of its dual membership flow.

## Preview locally

Serve the folder with any static file server and open `index.html`. No package installation or compilation is required.

## Connect the live services

- Set `applicationApiBase` in `site-config.js` after the authenticated Azure API is available.
- Keep Stripe secret keys, webhook secrets, and Price IDs in the Azure service, never in this repository or browser configuration.
- Have the server create Checkout Sessions only for authenticated, approved applications and map the browser's public plan key to a private Stripe Price ID.
- Treat signed Stripe webhooks—not browser success redirects—as the source of membership activation truth.
- Connect the application form to Azure only after authentication, rate limits, validation, and secure storage are in place.
- Follow the [billing integration contract](docs/billing/README.md) when adding Stripe credentials.
- Complete the [legal launch checklist](docs/legal/README.md), add the LLC mailing address, and obtain counsel approval before collecting real applicant data or taking payment.

## Verification design

The versioned [verification documentation](docs/verification/README.md) defines the legal and healthcare submission payloads, approved primary-source paths, normalized result states, public badge wording, manual-review rules, and the process for adding states or countries. It treats account identity, billing, professional standing, entity registration, and organization affiliation as separate facts.

## Legal and trust center

The public [Legal & Trust Center](legal.html) links the Privacy Notice, Terms & Conditions, Intended Use, Verification Disclosure, and Cookie Notice. The onboarding preview requires separate acknowledgments and carries version identifiers for the future server-side consent record. These pages remain attorney-review drafts until the launch checklist is approved.

## Publish with GitHub Pages

The included workflow publishes the static files from `main`. In the repository settings, choose **GitHub Actions** as the Pages source. The workflow performs no site build.

## Current scope

- Responsive public landing page
- Separate legal and mental-health membership entry points
- Three-step free-application preview
- Approved-member activation preview with fixed Individual and Organization pricing
- Profile and professional-endorsement presentation
- Privacy-first product principles
- Static GitHub Pages publishing workflow

Stripe billing, credential verification, member authentication, directory access, and persistent applications remain service integrations rather than browser-side code.
