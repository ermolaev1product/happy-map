# Happy Map

A multilingual event-discovery product that helps people find things to do nearby and turn them into plans.

**[Explore the English version](https://happymap.app/en/map)**

## Product overview

Map and list views for local events; city selection and event details; multilingual interfaces; event-source collection and curation; Android project.

## About this project

A product project by **Ilya Ermolayev**, developed with AI-assisted implementation. This repository presents the product and its implementation for portfolio review. It is a source snapshot of an actively evolving product. Production integrations require environment-specific configuration.

## Technology

React, TypeScript, Next.js-compatible routes, Vinext/Vite, Tailwind CSS, Cloudflare Workers and Drizzle.

## Run locally

Use Node.js 22.13 or newer.

```sh
npm ci
npm run dev
```

Some large production datasets and archived downloads are intentionally omitted from this portfolio export. See [DATA_NOT_INCLUDED.md](DATA_NOT_INCLUDED.md) for the exact list. The live English demo remains the best way to explore the complete product. A full local build requires independently supplied datasets matching the application schemas; the source import has not been validated as a standalone production deployment.

Open the URL printed by the development server. Production authentication, databases and scheduled data updates require separate configuration.

## Repository guide

- `app/` — application routes and API handlers
- `components/`, `hooks/`, `lib/` — interface and shared logic
- `scripts/`, `data/` — event collection, curation and maintenance
- `public/` — public assets and city datasets
- `android/` — Android application source

## Deployment and data

The live product uses separately configured hosting and services. Supply your own credentials and database bindings when deploying a copy. Never commit secrets or personal user data. Historical APK releases and generated build caches are not needed for source review.

English is the language of this repository's documentation; the product retains its supported interface languages.

## Ownership

No open-source license is granted by this repository. Third-party components and assets retain their respective licenses.
