# Domo Proxy Setup for Local Development

This guide explains how the Domo Ryuu proxy enables **live data access** during local development.

## Overview

The `@domoinc/ryuu-proxy` package is **already implemented** in this template and enables local development with **real Domo data**. When running locally, the proxy intercepts Domo API requests (like `/data/v1/sales`) and routes them through your authenticated Domo session, allowing you to:

- ✅ Test with **live data** from your Domo instance
- ✅ Develop and debug without deploying to Domo
- ✅ Use real datasets and data while coding locally
- ✅ Test API calls exactly as they will work in production

## How It Works

The proxy setup consists of:

1. **`proxy-setup.ts`** - Loads your manifest and initializes the Domo Proxy instance
2. **Vite Plugin** - Integrated in `vite.config.ts` to automatically inject the proxy middleware
3. **Automatic Routing** - All Domo API calls are intercepted and proxied to your Domo instance

When you make API calls like `Domo.get('/data/v1/sales')` in your React components, the proxy:
- Intercepts the request
- Authenticates using your Domo CLI session
- Routes it to your actual Domo instance
- Returns real data to your local app

## Setup Instructions

### 1. Install Dependencies

The proxy package is already included in `package.json`. Just run:

```bash
npm install
```

### 2. Configure manifest.json

Ensure your `public/manifest.json` is properly configured with:
- App name and ID
- Required permissions
- **`proxyId`** - This ties your app to a specific card in Domo (required for proxy to work)
- API access requirements
- Dataset mappings (if using datasets)

**To get your `proxyId`:**
1. Publish your app at least once using `domo publish`
2. Create a card from your app design
3. Right-click in the card and "Inspect element"
4. Find the `<iframe>` URL - the ID between `//` and `.domoapps` is your `proxyId`
5. Add it to your `public/manifest.json`:

```json
{
  "proxyId": "your-proxy-id-here",
  // ... rest of manifest
}
```

See the [Domo Starter Kits documentation](https://developer.domo.com/portal/u8w475o2245yp-starter-kits) for more details.

### 3. Authenticate with Domo

The proxy uses your Domo CLI session for authentication. Before starting development:

```bash
domo login
```

This authenticates your session, allowing the proxy to forward requests to Domo's APIs. If your session expires, just run `domo login` again.

### 4. Start Development Server

Start your development server as usual:

```bash
npm run dev
```

The proxy middleware will automatically:
- Load `public/manifest.json` on server start
- Intercept Domo API requests
- Route them through your authenticated Domo session
- Return live data to your app

**You'll see a confirmation message:**
```
✅ Domo Ryuu proxy middleware configured
```

If the proxy can't load (missing manifest or authentication), you'll see a warning but the app will continue running (API calls just won't work in development).

## Benefits of Using the Proxy

- **Live Data Testing**: Test with real data from your Domo instance without deploying
- **Faster Development**: Iterate quickly with hot reloading and real data
- **Production-Like Environment**: API calls work exactly as they will in production
- **Easy Debugging**: Console logs show real API responses during development

## Troubleshooting

### Proxy Not Working

**Symptoms:**
- API calls fail with 404 or authentication errors
- Console shows "⚠️ Domo proxy not available"

**Solutions:**
1. **Check manifest.json**: Ensure `public/manifest.json` exists and is valid JSON
2. **Verify proxyId**: Make sure `proxyId` is set in your manifest.json
3. **Authenticate**: Run `domo login` to refresh your authentication session
4. **Check manifest path**: The proxy looks for `public/manifest.json` - ensure it exists

### API Errors

- **401/403 errors**: Your Domo session may have expired - run `domo login` again
- **404 errors**: The dataset or endpoint may not exist, or your `proxyId` might be invalid
- **CORS issues**: The proxy handles CORS automatically - if issues persist, verify your Domo app permissions

### Development vs Production

- **Development**: Uses the proxy to access live Domo data
- **Production**: When deployed to Domo, API calls work directly (no proxy needed)

## Resources

- [Domo Starter Kits](https://developer.domo.com/portal/u8w475o2245yp-starter-kits)
- [Domo JavaScript SDK](https://developer.domo.com/portal/e947d87e17547-ryuu-js)
- [Ryuu Proxy Package](https://www.npmjs.com/package/@domoinc/ryuu-proxy)

