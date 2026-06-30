import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

// Polls every 3s while the AI pipeline is still `processing`, then stops once a
// terminal/review state is reached.
export function useAutoSubmission(token: string | null, id: number | null) {
  return useQuery({
    queryKey: ['auto-submission', id],
    queryFn: () => api.getAutoSubmission(token!, id!),
    enabled: !!token && id !== null,
    refetchInterval: query =>
      query.state.data?.status === 'processing' ? 3000 : false,
  })
}
