'use client'

import { FormIOCSSLoader } from './FormIOCSSLoader'
import { FormLoading } from './FormLoading'
import { FormError } from './FormError'
import { useFormIOGeneric } from './hooks/useFormIOGeneric'

interface FormIORenderGenericProps {
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

export default function FormIORenderGeneric({
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
}: FormIORenderGenericProps) {
  const { formRef, isLoading, error, currentPage, totalPages, isSaving, handlePrevious, handleNext, handleSaveExit } = useFormIOGeneric({
    formSchema,
    formId,
    recordId,
    initialData,
    initialPage,
    maxFilledStep,
    onSuccess,
    onError,
    onPrevious,
    onNext,
    onSaveExit,
  })

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
