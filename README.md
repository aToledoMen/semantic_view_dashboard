# Snowflake BI Explorer

A Domo Custom App that connects to Snowflake Intelligence via Domo Code Engine. Provides an interactive BI explorer for Snowflake Semantic Views with metric/dimension selection and data exploration.

## Tech Stack

- **React 18** + TypeScript
- **Vite** for builds
- **Tailwind CSS** + ShadCN UI components
- **ryuu.js** (Domo SDK)
- **Domo Code Engine** for Snowflake connectivity

## Quick Start

```bash
npm install
domo login
npm run dev
```

App runs at `http://localhost:5173`.

## Configuration

### Snowflake Connection (`src/config.ts`)

All Snowflake connection parameters are centralized in a single config file:

```typescript
export const SNOWFLAKE_CONFIG = {
  account: {
    id: '627',                                    // Domo Snowflake account ID
    type: 'ACCOUNT',
    subType: 'snowflakekeypairauthentication',
  },
  database: 'ATM_DB',                             // Snowflake database
  schema: 'SALES',                                // Snowflake schema
  semanticView: 'TPCH_ANALYSIS',                  // Semantic view name
  agent: 'TPCH_AGENT_EXAMPLE',                    // Snowflake Intelligence agent
}
```

**To point to a different semantic view or agent**, just update the values in this file. The parameters are sent dynamically in the request body to Code Engine.

### Domo Manifest (`public/manifest.json`)

The manifest configures the Domo app and its Code Engine function bindings:

| Field | Description |
|-------|-------------|
| `id` | App UUID (generated on first `domo publish`) |
| `proxyId` | Card ID for local dev proxy (see [PROXY_SETUP.md](./PROXY_SETUP.md)) |
| `packagesMapping` | Code Engine function bindings (see below) |

### Code Engine Functions

Two functions are configured in `packagesMapping`:

#### `getCatalog`
Returns the semantic view metadata (metrics, dimensions, time grains).

- **Alias:** `getCatalog`
- **Endpoint:** `POST /domo/codeengine/v2/packages/getCatalog`
- **Body params:** `snowflakeAccount`, `snowflakeDatabase`, `snowflakeSchema`, `semanticView`
- **Response:** `{ result: { semantic_view, metrics[], dimensions[], time_dimensions[], available_time_grains[] } }`

#### `explore`
Queries the semantic view with selected metrics/dimensions and returns data + visualization.

- **Alias:** `explore`
- **Endpoint:** `POST /domo/codeengine/v2/packages/explore`
- **Body params:** `snowflakeAccount`, `snowflakeDatabase`, `snowflakeSchema`, `snowflakeAgent`, `requestBody`
- **Response:** `{ result: { text, chart (Vega-Lite spec), data[], prompt } }`

### Adding a New Semantic View

1. Edit `src/config.ts` with the new `database`, `schema`, `semanticView`, and `agent` values
2. Ensure the Snowflake account (`account.id`) has access to the new semantic view
3. Restart the dev server

## Project Structure

```
src/
├── config.ts                  # Snowflake connection config
├── types/
│   └── catalog.ts             # TypeScript interfaces for API responses
├── lib/
│   ├── api.ts                 # Code Engine API calls (fetchCatalog, explore)
│   └── utils.ts               # Tailwind class merge utility
├── components/
│   ├── HeaderBar.tsx           # Top nav bar with branding
│   ├── Sidebar.tsx             # Left panel with metric/dimension checkboxes
│   ├── SidebarSection.tsx      # Collapsible section with search filter
│   ├── MainContent.tsx         # Right panel (exploration results)
│   └── ui/                    # ShadCN components (checkbox, badge, input, etc.)
├── App.tsx                    # Root component, state management
├── main.tsx                   # Entry point
└── index.css                  # Tailwind + brand color variables
```

## UI Theme

Custom color palette combining Snowflake and Domo brand colors:

| Token | Color | Usage |
|-------|-------|-------|
| Primary | `#29B5E8` (Snowflake blue) | Actions, selected items, focus rings |
| Sidebar BG | `#1B1F3B` (Domo navy) | Sidebar background |
| Accent | `#14B8A6` (teal) | Accent highlights |
| Background | `#F7F9FC` | Main content area |

Color variables are defined in `src/index.css` and extended in `tailwind.config.js` with custom `sidebar.*` tokens.

## Build & Deploy

```bash
npm run build        # TypeScript check + Vite build → dist/
domo publish         # Deploy to Domo
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with Domo proxy |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build locally |

## Resources

- [Domo JavaScript SDK](https://developer.domo.com/portal/e947d87e17547-ryuu-js)
- [Domo Code Engine](https://developer.domo.com/portal/u8w475o2245yp-starter-kits)
- [Snowflake Semantic Views](https://docs.snowflake.com/en/user-guide/views-semantic)
- [ShadCN UI](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com)
