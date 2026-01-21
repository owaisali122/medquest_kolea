interface FormSuccessProps {
  message: string
}

/**
 * Success state component after form submission
 */
export function FormSuccess({ message }: FormSuccessProps) {
  return (
    <div className="p-6 bg-green-50 border border-green-200 rounded-lg text-green-800 text-center">
      <svg
        className="mx-auto h-12 w-12 text-green-500 mb-4"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <p className="text-lg font-semibold">{message}</p>
    </div>
  )
}
