import type { LocationQuery, LocationQueryRaw } from 'vue-router'
import type { QueryRecord } from '@/models/common'

const takeSingle = (value: LocationQuery[string]) => {
  if (Array.isArray(value)) {
    return value[0]
  }

  return value
}

export const buildRouteQuery = (query: QueryRecord): LocationQueryRaw => {
  return Object.entries(query).reduce<LocationQueryRaw>((result, [key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      result[key] = String(value)
    }

    return result
  }, {})
}

export const pickRouteQuery = (query: LocationQuery, keys: string[]) => {
  return keys.reduce<Record<string, string>>((result, key) => {
    const value = takeSingle(query[key])
    if (typeof value === 'string') {
      result[key] = value
    }
    return result
  }, {})
}
