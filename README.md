# FEFE Connect

**Firms & Experts, Fully Evaluated.**

FEFE Connect is a private professional network for verified legal and mental-health professionals. This repository contains the no-build static website and a working front-end preview of its dual membership flow.

## Preview locally

Serve the folder with any static file server and open `index.html`. No package installation or compilation is required.

## Connect the live services

- Add the two public Stripe Payment Link URLs to `site-config.js`.
- Keep all Stripe secret keys and service credentials in the Azure service, never in this repository.
- Configure Stripe success redirects to a server-verified continuation URL.
- Connect the application form to an Azure endpoint only after authentication, rate limits, validation, and secure storage are in place.
- Replace the placeholder privacy page with counsel-reviewed terms before collecting real applicant data.

## Publish with GitHub Pages

The included workflow publishes the static files from `main`. In the repository settings, choose **GitHub Actions** as the Pages source. The workflow performs no site build.

## Current scope

- Responsive public landing page
- Separate legal and mental-health membership entry points
- Three-step onboarding preview
- Profile and professional-endorsement presentation
- Privacy-first product principles
- Static GitHub Pages publishing workflow

Stripe billing, credential verification, member authentication, directory access, and persistent applications remain service integrations rather than browser-side code.
