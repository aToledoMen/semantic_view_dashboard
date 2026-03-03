import { useState } from 'react'
import Domo from 'ryuu.js'

function App() {
  const [testData, setTestData] = useState<any>(null)
  const [testLoading, setTestLoading] = useState(false)
  const [testError, setTestError] = useState<string | null>(null)

  const handleTestDataFetch = async () => {
    setTestLoading(true)
    setTestError(null)
    setTestData(null)

    try {
      // Test API call to fetch sales data
      const data = await Domo.get('/data/v1/sales')
      console.log('Sales data fetched:', data)
      setTestData(data)
    } catch (error: any) {
      const errorMsg = error?.message || 'Unknown error occurred'
      setTestError(errorMsg)
      console.error('Error fetching sales data:', error)
    } finally {
      setTestLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl p-8">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Domo React Template
            </h1>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
              A reusable template for building Domo custom apps with React, TypeScript, Vite, Tailwind CSS, and ShadCN components.
            </p>
            
            <div className="space-y-4">
              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <h2 className="text-xl font-semibold text-green-900 dark:text-green-100 mb-3">
                  Test Domo API Connection
                </h2>
                <p className="text-sm text-green-800 dark:text-green-200 mb-4">
                  Click the button below to test fetching data from the <code className="bg-green-100 dark:bg-green-900 px-1 rounded">/data/v1/sales</code> endpoint.
                </p>
                <button
                  onClick={handleTestDataFetch}
                  disabled={testLoading}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white rounded-md font-medium transition-colors"
                >
                  {testLoading ? 'Fetching...' : 'Test API Call'}
                </button>

                {testError && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                    <p className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Error:</p>
                    <p className="text-sm text-red-800 dark:text-red-200">{testError}</p>
                  </div>
                )}

                {testData && (
                  <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded">
                    <p className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">Success! Data received:</p>
                    <div className="bg-white dark:bg-slate-800 p-3 rounded border border-green-200 dark:border-green-700">
                      <pre className="text-xs text-slate-700 dark:text-slate-300 overflow-auto max-h-60">
                        {JSON.stringify(testData, null, 2)}
                      </pre>
                    </div>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-2">
                      Array length: {Array.isArray(testData) ? testData.length : 'Not an array'}
                    </p>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-700 rounded-lg">
                <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">
                  Features
                </h2>
                <ul className="list-disc list-inside space-y-1 text-slate-700 dark:text-slate-300">
                  <li>React 18 with TypeScript</li>
                  <li>Vite for fast development and builds</li>
                  <li>Tailwind CSS for styling</li>
                  <li>ShadCN UI components ready to use</li>
                  <li>Domo SDK integration</li>
                  <li>Local development via ryuu.js</li>
                </ul>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <h2 className="text-xl font-semibold text-blue-900 dark:text-blue-100 mb-2">
                  Next Steps
                </h2>
                  <ol className="list-decimal list-inside space-y-1 text-blue-800 dark:text-blue-200">
                  <li>Add ShadCN components: <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">npx shadcn@latest add button</code></li>
                  <li>Configure <code className="bg-blue-100 dark:bg-blue-900 px-1 rounded">domo/manifest.json</code> for your app</li>
                  <li>Start building your Domo app!</li>
                  <li>(View the README.md for more detail)</li>
                </ol>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default App

