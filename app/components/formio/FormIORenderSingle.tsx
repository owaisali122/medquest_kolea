'use client'

import React, { useCallback, useState } from 'react'
import { FormIOCSSLoader } from './FormIOCSSLoader'
import { FormLoading } from './FormLoading'
import { FormError } from './FormError'
import { useFormIOCore } from './hooks/useFormIOCore'

interface FormIORenderSingleProps {
  formSchema: any
  formId: number
  initialData?: Record<string, any>
  onSubmit?: (data: Record<string, any>, formInstanceRef: React.MutableRefObject<any>) => void | Promise<void>
  onError?: (error: string) => void
  submitButton: React.ReactElement
  cancelButton?: React.ReactElement
  onCancel?: () => void
}

export default function FormIORenderSingle({
  formSchema,
  formId,
  initialData,
  onSubmit,
  onError,
  submitButton,
  cancelButton,
  onCancel,
}: FormIORenderSingleProps) {
  const { formRef, formInstanceRef, isLoading, error } = useFormIOCore({
    formSchema,
    formId,
    initialData,
    mode: 'single',
    onError,
  })
  const [isSaving, setIsSaving] = useState(false)

  const handleSubmit = useCallback(async () => {
    if (!onSubmit) return
    const form = formInstanceRef.current
    if (!form) return
    const data = form.submission?.data ?? {}
    const wizard = form.root || form
    const isValid = wizard?.checkValidity
      ? wizard.checkValidity(data, true, data, true)
      : form.checkValidity?.(data, true) !== false
    if (!isValid) return

    setIsSaving(true)
    try {
      await onSubmit(data, formInstanceRef)
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Error')
    } finally {
      setIsSaving(false)
    }
  }, [onSubmit, onError, formInstanceRef])

  if (error) return <FormError message={error} />

  return (
    <>
      <FormIOCSSLoader />
      <div className="formio-container">
        {isLoading && <FormLoading />}
        <div ref={formRef} data-formio-mount className={isLoading ? 'hidden' : ''} style={{ minHeight: '200px' }} />
      </div>
      {!isLoading && (
        <div className="form-navigation mt-6 flex flex-wrap gap-3">
          {cancelButton && onCancel && React.cloneElement(cancelButton, { onClick: onCancel })}
          {React.cloneElement(submitButton, { onClick: handleSubmit, disabled: isSaving })}
        </div>
      )}
    </>
  )
}
