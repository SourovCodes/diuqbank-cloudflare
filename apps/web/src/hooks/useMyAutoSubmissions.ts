import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useMyAutoSubmissions(token: string | null, page = 1) {
  return useQuery({
    queryKey: ['my-auto-submissions', page],
    queryFn: () => api.myAutoSubmissions(token!, page),
    enabled: !!token,
    placeholderData: keepPreviousData,
  })
}
