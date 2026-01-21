import { ReactNode } from 'react'

interface FormBodyProps {
  children: ReactNode
}

/**
 * Form body component for form content
 */
export function FormBody({ children }: FormBodyProps) {
  return <div className="px-6 py-8">{children}</div>
}
