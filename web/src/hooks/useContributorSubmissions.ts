import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useContributorSubmissions(username: string, page = 1) {
  return useQuery({
    queryKey: ['contributor-submissions', username, page],
    queryFn: () => api.contributorSubmissions(username, page),
    enabled: !!username,
    placeholderData: keepPreviousData,
  })
}
