'use client'

import { useRouter } from 'next/navigation'
import FormIORenderSingleWithSlug from '@/app/components/formio/FormIORenderSingleWithSlug'

const USER_REGISTRATION_SLUG = 'user-registration'
const LIST_URL = '/forms/user-registration/list'

interface UserRegistrationFormProps {
  recordId?: number | null
  initialData?: Record<string, any>
}

export default function UserRegistrationForm({
  recordId = null,
  initialData,
}: UserRegistrationFormProps) {
  const router = useRouter()

  const handleSubmit = async (data: Record<string, any>) => {
    const cleanData = { ...data }
    delete cleanData.submit
    delete cleanData.cancel

    const submitRes = await fetch('/api/forms/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: 0, data: cleanData }),
    })
    if (!submitRes.ok) throw new Error((await submitRes.json()).error || 'Failed to submit')
    router.push(LIST_URL)
  }

  const handleCancel = () => router.push(LIST_URL)

  return (
    <FormIORenderSingleWithSlug
      slug={USER_REGISTRATION_SLUG}
      initialData={initialData}
      onSubmit={handleSubmit}
      onError={(e) => console.error(e)}
      submitButton={
        <button type="button" className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          Submit
        </button>
      }
      cancelButton={
        <button type="button" className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-200">
          Cancel
        </button>
      }
      onCancel={handleCancel}
    />
  )
}
