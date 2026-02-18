interface FormHeaderProps {
  title: string
  description?: string
}

/**
 * Form header component displaying title and description
 */
export function FormHeader({ title, description }: FormHeaderProps) {
  return (
    <div className="px-6 py-8 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
        {title}
      </h1>
      {description && <p className="text-gray-600 mt-2 text-base leading-relaxed">{description}</p>}
    </div>
  )
}
