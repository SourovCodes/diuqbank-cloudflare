import { toast } from 'sonner'

/**
 * Surface an error to the user as a toast, preferring the API's message
 * (ApiError / Error carry it) and falling back to a generic line otherwise.
 */
export function toastError(err: unknown, fallback = 'Something went wrong. Please try again.') {
  toast.error(err instanceof Error ? err.message : fallback)
}

/** Surface a success message. */
export function toastSuccess(message: string) {
  toast.success(message)
}

export { toast }
