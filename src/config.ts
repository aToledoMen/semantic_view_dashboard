export const SNOWFLAKE_CONFIG = {
  account: {
    id: '627',
    type: 'ACCOUNT' as const,
    subType: 'snowflakekeypairauthentication' as const,
  },
  database: 'ATM_DB',
  schema: 'SALES',
  semanticView: 'TPCH_ANALYSIS',
  agent: 'TPCH_AGENT_EXAMPLE',
  warehouse: 'EMEA_GENERAL_PURPOSE', // TODO: update with your actual warehouse name
}
