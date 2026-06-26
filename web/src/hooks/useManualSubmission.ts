import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useManualSubmission(token: string | null, id: number | null) {
  return useQuery({
    queryKey: ['manual-submission', id],
    queryFn: () => api.getManualSubmission(token!, id!),
    enabled: !!token && id !== null,
  })
}
