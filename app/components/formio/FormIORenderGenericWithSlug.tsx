'use client'

import { useEffect, useState } from 'react'
import FormIORenderGeneric from './FormIORenderGeneric'
import { FormLoading } from './FormLoading'
import { FormError } from './FormError'

interface FormIORenderGenericWithSlugProps {
  slug: string
  recordId?: number | null
  initialData?: Record<string, any>
  initialPage?: number
  maxFilledStep?: number
  onSuccess?: () => void
  onError?: (error: string) => void
  onPrevious?: (state: any) => void | Promise<void>
  onNext?: (state: any) => void | Promise<void>
  onSaveExit?: (state: any) => void | Promise<void>
}

export default function FormIORenderGenericWithSlug({
  slug,
  recordId = null,
  initialData,
  initialPage,
  maxFilledStep,
  onSuccess,
  onError,
  onPrevious,
  onNext,
  onSaveExit,
}: FormIORenderGenericWithSlugProps) {
  const [form, setForm] = useState<{ id: number; schema: any } | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    if (!slug) return

    const load = async () => {
      try {
        setLoadError(null)
        const res = await fetch(`/api/forms/get-by-slug?slug=${encodeURIComponent(slug)}`)
        if (!res.ok) {
          const err = await res.json()
          throw new Error(err.error || 'Failed to load form')
        }
        const data = await res.json()
        setForm({ id: data.id, schema: data.schema })
      } catch (err: any) {
        setLoadError(err.message || 'Failed to load form')
      }
    }

    load()
  }, [slug])

  if (loadError) return <FormError message={loadError} />
  if (!form) return <FormLoading />

  return (
    <FormIORenderGeneric
      formSchema={form.schema}
      formId={form.id}
      recordId={recordId}
      initialData={initialData}
      initialPage={initialPage}
      maxFilledStep={maxFilledStep}
      onSuccess={onSuccess}
      onError={onError}
      onPrevious={onPrevious}
      onNext={onNext}
      onSaveExit={onSaveExit}
    />
  )
}
