# Domo React TypeScript Template

A reusable template for building Domo custom apps with React, TypeScript, Vite, Tailwind CSS, and ShadCN components.

> 🚀 **Ready to use!** This template includes everything you need to start building Domo custom apps with modern React tooling and live data development.

## Features

- ⚡️ **Vite** - Fast development and optimized builds
- ⚛️ **React 18** - Latest React with TypeScript
- 🎨 **Tailwind CSS** - Utility-first CSS framework
- 🧩 **ShadCN UI** - Beautiful, accessible component library
- 🏢 **Domo Integration** - Ready-to-use Domo SDK integration with `ryuu.js`
- 🔄 **Live Reloading** - Hot module replacement during development
- 🛠️ **TypeScript** - Full type safety
- 🚀 **Live Data Proxy** - Test with real Domo data during local development via Ryuu proxy

## Prerequisites

- Node.js 18+ and npm
- Domo Developer Portal access

## Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```
   
   This will install `ryuu.js` (Domo SDK) automatically via npm.

2. **Generate App ID:**
   
   In order to generate the `id` parameter in `public/manifest.json`, you need to build and publish your app:
   
   ```bash
   npm run build
   domo publish
   ```
   
   This will generate the `id` in the `dist/manifest.json` file. Copy this `id` value from `dist/manifest.json` back into your development `public/manifest.json` file.
   
   **Note:** The `id` is unique to your app instance and is required for the Domo app to function properly.

3. **Configure Domo App:**
   - Edit `public/manifest.json` with your app details:
     - App name and **`id`** (generated in step 2 above)
     - **`proxyId`** - Required for local development proxy (see below and [PROXY_SETUP.md](./PROXY_SETUP.md))
     - Required permissions
     - API access requirements
     - Dataset mappings (if using datasets)
   - See [Domo Starter Kits](https://developer.domo.com/portal/u8w475o2245yp-starter-kits) for configuration details

4. **Generate Proxy ID (for local development):**
   
   Once your app has an `id`, you can generate the `proxyId` needed for local development:
   
   - Ensure your app is published (from step 2)
   - Create a card from your app design in Domo
   - Right-click within the card and select "Inspect element"
   - Locate the `<iframe>` URL - the ID between `//` and `.domoapps` is your `proxyId`
   - Copy this `proxyId` into your `public/manifest.json`
   
   See [PROXY_SETUP.md](./PROXY_SETUP.md) for detailed instructions on getting your `proxyId`.

## Development

Start the development server with hot reloading:

```bash
npm run dev
```

The app will be available at `http://localhost:5173` (or the port Vite assigns).

### Local Development with Live Domo Data

**The Ryuu proxy is already implemented** in this template, enabling you to test with **real Domo data** during local development!

**Quick Setup:**

1. **Authenticate with Domo:**
   ```bash
   domo login
   ```

2. **Ensure `public/manifest.json` has a `proxyId`:**
   - See [PROXY_SETUP.md](./PROXY_SETUP.md) for how to get your `proxyId`

3. **Start development:**
   ```bash
   npm run dev
   ```

The proxy automatically intercepts Domo API calls (like `Domo.get('/data/v1/sales')`) and routes them through your authenticated Domo session, giving you **live data** in your local environment.

**Benefits:**
- ✅ Test with real data from your Domo instance
- ✅ Develop without deploying to Domo
- ✅ Debug API calls with actual responses
- ✅ Iterate faster with hot reloading + live data

For detailed proxy setup instructions, see [PROXY_SETUP.md](./PROXY_SETUP.md).

## Building for Production

Build the app for production:

```bash
npm run build
```

The build output will be in the `dist/` directory.

## Deployment to Domo

1. **Build the app:**
   ```bash
   npm run build
   ```

2. **Deploy to Domo:**
   - Package the `dist/` folder contents
   - Upload through the Domo Developer Portal
   - Follow Domo's deployment guidelines for custom apps

## Adding ShadCN Components

Add ShadCN UI components to your project:

```bash
npx shadcn@latest add button
npx shadcn@latest add card
npx shadcn@latest add input
# ... etc
```

Components will be added to `src/components/ui/` and can be imported like:

```tsx
import { Button } from "@/components/ui/button"
```

## Project Structure

```
├── public/
│   ├── manifest.json    # Domo app configuration (includes proxyId)
│   └── thumbnail.png    # App thumbnail
├── proxy-setup.ts       # Ryuu proxy setup for local development
├── src/
│   ├── components/
│   │   └── ui/          # ShadCN components
│   ├── lib/
│   │   └── utils.ts     # Utility functions
│   ├── App.tsx          # Main app component
│   ├── main.tsx         # Application entry point
│   ├── index.css        # Tailwind CSS directives
│   └── vite-env.d.ts    # TypeScript declarations
├── index.html           # HTML template
├── vite.config.ts       # Vite configuration
├── tailwind.config.js   # Tailwind CSS configuration
└── tsconfig.json        # TypeScript configuration
```

## Using the Domo SDK

The Domo SDK (`ryuu.js`) is installed via npm and imported as an ES module. TypeScript definitions are included automatically.

```tsx
import { useEffect } from 'react'
import Domo from 'ryuu.js'

function MyComponent() {
  useEffect(() => {
    // Fetch data from Domo
    Domo.get('/data/v1/dataset')
      .then(data => {
        console.log('Data:', data)
      })
      .catch(error => {
        console.error('Error:', error)
      })

    // Example: POST request
    Domo.post('/data/v1/dataset', { id: 'my-dataset-id' }, { body: 'data' })
      .then(response => {
        console.log('Response:', response)
      })
  }, [])

  return <div>My Component</div>
}
```

### Alternative: CDN / Script Tag

If you prefer using the CDN instead of npm, you can add this to `index.html`:

```html
<script src="https://unpkg.com/ryuu.js"></script>
```

Then use `Domo` globally in your code. However, the npm import method is recommended for better TypeScript support and bundling.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally

## Resources

- [Domo JavaScript SDK Documentation](https://developer.domo.com/portal/e947d87e17547-ryuu-js)
- [Domo Starter Kits](https://developer.domo.com/portal/u8w475o2245yp-starter-kits)
- [ShadCN UI Documentation](https://ui.shadcn.com)
- [Tailwind CSS Documentation](https://tailwindcss.com)
- [Vite Documentation](https://vitejs.dev)

## License

This template is provided as-is for building Domo custom applications.

