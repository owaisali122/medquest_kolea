'use client'

import { useEffect, useState } from 'react'
import FormIORenderSingle from './FormIORenderSingle'
import { FormLoading } from './FormLoading'
import { FormError } from './FormError'

interface FormIORenderSingleWithSlugProps {
  slug: string
  initialData?: Record<string, any>
  onSubmit?: (data: Record<string, any>, formInstanceRef: React.MutableRefObject<any>) => void | Promise<void>
  onError?: (error: string) => void
  submitButton: React.ReactElement
  cancelButton?: React.ReactElement
  onCancel?: () => void
}

export default function FormIORenderSingleWithSlug({
  slug,
  initialData,
  onSubmit,
  onError,
  submitButton,
  cancelButton,
  onCancel,
}: FormIORenderSingleWithSlugProps) {
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
    <FormIORenderSingle
      formSchema={form.schema}
      formId={form.id}
      initialData={initialData}
      onSubmit={onSubmit}
      onError={onError}
      submitButton={submitButton}
      cancelButton={cancelButton}
      onCancel={onCancel}
    />
  )
}
