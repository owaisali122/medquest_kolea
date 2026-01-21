interface FormHeaderProps {
  title: string
  description?: string
}

/**
 * Form header component displaying title and description
 */
export function FormHeader({ title, description }: FormHeaderProps) {
  return (
    <div className="px-6 py-8 border-b border-gray-200">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      {description && <p className="text-gray-600 mt-2">{description}</p>}
    </div>
  )
}
