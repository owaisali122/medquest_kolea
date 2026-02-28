'use client'

import { useCallback, useState } from 'react'
import { FormIOCSSLoader } from './FormIOCSSLoader'
import { FormLoading } from './FormLoading'
import { FormError } from './FormError'
import { useFormIOCore } from './hooks/useFormIOCore'

interface FormIORenderWizardProps {
  formSchema: any
  formId: number
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

export default function FormIORenderWizard({
  formSchema,
  formId,
  recordId = null,
  initialData,
  initialPage,
  maxFilledStep,
  onSuccess,
  onError,
  onPrevious,
  onNext,
  onSaveExit,
}: FormIORenderWizardProps) {
  const { formRef, formInstanceRef, isLoading, error, currentPage, totalPages } = useFormIOCore({
    formSchema,
    formId,
    initialData,
    initialPage,
    maxFilledStep,
    mode: 'wizard',
    onError,
  })
  const [isSaving, setIsSaving] = useState(false)

  const getState = useCallback(() => ({
    formInstanceRef,
    formId,
    recordId: recordId ?? null,
    currentPage,
    totalPages,
  }), [formInstanceRef, formId, recordId, currentPage, totalPages])

  const handlePrevious = useCallback(async () => {
    if (!onPrevious) return
    setIsSaving(true)
    try {
      await onPrevious(getState())
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Error')
    } finally {
      setIsSaving(false)
    }
  }, [onPrevious, getState, onError])

  const handleNext = useCallback(async () => {
    if (!onNext) return
    setIsSaving(true)
    try {
      await onNext(getState())
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Error')
    } finally {
      setIsSaving(false)
    }
  }, [onNext, getState, onError])

  const handleSaveExit = useCallback(async () => {
    if (!onSaveExit) return
    setIsSaving(true)
    try {
      await onSaveExit(getState())
    } catch (e) {
      onError?.(e instanceof Error ? e.message : 'Error')
    } finally {
      setIsSaving(false)
    }
  }, [onSaveExit, getState, onError])

  if (error) return <FormError message={error} />

  return (
    <>
      <FormIOCSSLoader />
      <div className="formio-container">
        {isLoading && <FormLoading />}
        <div ref={formRef} data-formio-mount className={isLoading ? 'hidden' : ''} style={{ minHeight: '200px' }} />
      </div>
      <div className="form-navigation mt-6 flex flex-wrap gap-3">
        {currentPage > 0 && (
          <button type="button" onClick={handlePrevious} disabled={isSaving} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg font-medium hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed">
            Previous
          </button>
        )}
        <button type="button" onClick={handleSaveExit} disabled={isSaving} className="px-4 py-2 bg-gray-100 text-gray-700 border border-gray-300 rounded-lg font-medium hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSaving ? 'Saving...' : 'Save & Exit'}
        </button>
        <button type="button" onClick={handleNext} disabled={isSaving} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
          {isSaving ? 'Saving...' : currentPage === totalPages - 1 ? 'Submit' : 'Next'}
        </button>
      </div>
    </>
  )
}
