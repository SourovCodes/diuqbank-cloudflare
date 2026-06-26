import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useMyManualSubmissions(token: string | null, page = 1) {
  return useQuery({
    queryKey: ['my-manual-submissions', page],
    queryFn: () => api.myManualSubmissions(token!, page),
    enabled: !!token,
    placeholderData: keepPreviousData,
  })
}
