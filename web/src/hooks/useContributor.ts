import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useContributor(username: string) {
  return useQuery({
    queryKey: ['contributor', username],
    queryFn: () => api.contributor(username),
    enabled: !!username,
  })
}
