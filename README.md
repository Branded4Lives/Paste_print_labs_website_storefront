# Pastel Print Labs

React + Vite headless storefront for Pastel Print Labs. Shopify is used as the
backend for products, cart, checkout, payments, orders, and inventory.

## Shopify Backend

Create `.env.local` from `.env.example` and add the public Storefront API token:

```bash
VITE_SHOPIFY_STORE_DOMAIN=pastel-print-labs-xdgqiy21.myshopify.com
VITE_SHOPIFY_STOREFRONT_TOKEN=your_public_storefront_token
VITE_SHOPIFY_API_VERSION=2026-07
```

In Shopify Admin, use **Headless > Pastel Print Labs Headless > Storefront API >
Manage** to create or reveal the Storefront API public access token. Products
also need to be published to this Headless/custom storefront sales channel.

## Local Development

```bash
npm install
npm run dev
```

## Checks

```bash
npm run lint
npm run build
```

## CI/CD

The GitHub Actions workflow in `.github/workflows/ci-cd.yml` runs on pull
requests and pushes to `main` or `master`.

- Installs dependencies with `npm ci`
- Runs `npm run lint`
- Runs `npm run build`
- Uploads the generated `dist` folder as a workflow artifact
- Deploys to GitHub Pages on pushes to `main` or `master`

To use the deploy step, push this project to GitHub and set Pages to use
GitHub Actions as the source in the repository settings.

## Headless Checkout

The storefront reads products with the Storefront API, creates a Shopify cart,
stores the cart ID in the browser, and sends shoppers to Shopify Checkout with
the cart checkout URL.
