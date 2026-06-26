import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'

export function useQuestion(id: string) {
  return useQuery({
    queryKey: ['question', id],
    queryFn: () => api.question(id),
    enabled: !!id,
  })
}
