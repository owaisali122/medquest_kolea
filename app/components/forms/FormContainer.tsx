import { ReactNode } from 'react'

interface FormContainerProps {
  children: ReactNode
}

/**
 * Container component for form pages
 */
export function FormContainer({ children }: FormContainerProps) {
  return (
    <div className="bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="bg-white shadow-lg rounded-lg overflow-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
