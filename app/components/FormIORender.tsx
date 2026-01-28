'use client'

import { FormIOCSSLoader } from './formio/FormIOCSSLoader'
import { FormLoading } from './formio/FormLoading'
import { FormError } from './formio/FormError'
import { FormSuccess } from './formio/FormSuccess'
import { useFormIO } from './formio/hooks/useFormIO'

interface FormIORenderProps {
  formSchema: any
  formId: number
  onSubmitUrl?: string
  submitButtonText?: string
  initialData?: Record<string, any> // Initial form data to populate
}

/**
 * Main FormIO renderer component
 * Handles form display, submission, and all states
 */
export default function FormIORender({
  formSchema,
  formId,
  onSubmitUrl = '/api/forms/submit',
  submitButtonText = 'Submit',
  initialData,
}: FormIORenderProps) {
  const { formRef, isLoading, error, isSubmitted, submitMessage } = useFormIO({
    formSchema,
    formId,
    onSubmitUrl,
    initialData,
  })

  // Show error state
  if (error) {
    return <FormError message={error} />
  }

  // Show success state
  if (isSubmitted) {
    return <FormSuccess message={submitMessage || 'Thank you for your submission!'} />
  }

  // Show loading or form
  return (
    <>
      <FormIOCSSLoader />
      <div className="formio-container">
        {isLoading && <FormLoading />}
        <div
          ref={formRef}
          className={isLoading ? 'hidden' : ''}
          style={{ minHeight: '200px' }}
        />
      </div>
    </>
  )
}
