interface FormErrorProps {
  message: string
}

/**
 * Error state component for FormIO forms
 */
export function FormError({ message }: FormErrorProps) {
  return (
    <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
      <div className="flex items-center">
        <svg
          className="h-5 w-5 mr-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>{message}</span>
      </div>
    </div>
  )
}
