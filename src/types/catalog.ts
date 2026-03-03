export interface CatalogMetric {
  name: string
  display_name: string
  description: string
  data_type: string
  synonyms: string[]
}

export interface CatalogDimension {
  name: string
  display_name: string
  description: string
  data_type: string
  synonyms: string[]
  type: 'geographic' | 'categorical' | 'time'
  sample_values: string[]
}

export interface CatalogResponse {
  semantic_view: string
  description: string
  metrics: CatalogMetric[]
  dimensions: CatalogDimension[]
  time_dimensions: CatalogDimension[]
  available_time_grains: string[]
}
