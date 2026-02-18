import { ReactNode } from 'react'

interface FormContainerProps {
  children: ReactNode
  className?: string
}

/**
 * Container component for form pages
 */
export function FormContainer({ children, className = '' }: FormContainerProps) {
  return (
    <div className={`bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 min-h-screen py-12 px-4 sm:px-6 lg:px-8 ${className}`}>
      <div className="max-w-4xl mx-auto">
        <div className="bg-white shadow-xl rounded-xl overflow-hidden border border-gray-100">
          {children}
        </div>
      </div>
    </div>
  )
}
