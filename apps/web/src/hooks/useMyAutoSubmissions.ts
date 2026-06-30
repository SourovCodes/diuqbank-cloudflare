import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'

// Keeps polling while any listed submission is still `processing` so the page
// reflects the AI outcome without a manual refresh.
export function useMyAutoSubmissions(token: string | null, page = 1) {
  return useQuery({
    queryKey: ['my-auto-submissions', page],
    queryFn: () => api.myAutoSubmissions(token!, page),
    enabled: !!token,
    placeholderData: keepPreviousData,
    refetchInterval: query =>
      query.state.data?.data.some(s => s.status === 'processing') ? 4000 : false,
  })
}
