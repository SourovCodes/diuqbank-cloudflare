import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useSubmissions(questionId: string) {
  return useQuery({
    queryKey: ['submissions', questionId],
    queryFn: () => api.submissions(questionId),
    enabled: !!questionId,
  })
}
