import { useQuery, keepPreviousData } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { QuestionFilters } from '@diuqbank/shared/types'

export function useQuestions(filters: QuestionFilters) {
  return useQuery({
    queryKey: ['questions', filters],
    queryFn: () => api.questions(filters),
    placeholderData: keepPreviousData,
  })
}
