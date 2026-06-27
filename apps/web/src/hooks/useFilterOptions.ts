import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useFilterOptions() {
  return useQuery({
    queryKey: ['filter-options'],
    queryFn: api.filterOptions,
    staleTime: Infinity,
  })
}
