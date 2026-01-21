/**
 * Loading state component for FormIO forms
 */
export function FormLoading() {
  return (
    <div className="p-6 text-center">
      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      <p className="mt-2 text-gray-600">Loading form...</p>
    </div>
  )
}
