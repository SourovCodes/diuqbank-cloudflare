export function ErrorMessage({ message = 'Something went wrong. Please try again.' }: { message?: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
      {message}
    </div>
  )
}
