import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useAutoSubmission(token: string | null, id: number | null) {
  return useQuery({
    queryKey: ['auto-submission', id],
    queryFn: () => api.getAutoSubmission(token!, id!),
    enabled: !!token && id !== null,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      return status === 'processing' ? 2000 : false
    },
  })
}
