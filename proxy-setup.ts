import { Proxy } from '@domoinc/ryuu-proxy'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Get the directory of the current module (for ES modules)
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load manifest.json from public directory
const manifestPath = join(__dirname, 'public', 'manifest.json')
let manifest: any

try {
  const manifestContent = readFileSync(manifestPath, 'utf-8')
  manifest = JSON.parse(manifestContent)
} catch (error) {
  console.warn('Could not load manifest.json. Proxy will not be available.')
  console.warn('Make sure public/manifest.json exists and is valid JSON.')
  throw error
}

// Initialize the proxy with the manifest
export const proxy = new Proxy({ manifest })

// Export the middleware function
// The express() method returns Express-compatible middleware
export function getProxyMiddleware() {
  return proxy.express()
}

