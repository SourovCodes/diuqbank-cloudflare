import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useContributors(page = 1, perPage = 20) {
  return useQuery({
    queryKey: ['contributors', page, perPage],
    queryFn: () => api.contributors(page, perPage),
    placeholderData: keepPreviousData,
  })
}
