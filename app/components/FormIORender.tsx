'use client'

import { FormIOCSSLoader } from './formio/FormIOCSSLoader'
import { FormLoading } from './formio/FormLoading'
import { FormError } from './formio/FormError'
import { FormSuccess } from './formio/FormSuccess'
import { useFormIO } from './formio/hooks/useFormIO'
import { useEffect } from 'react'

interface FormIORenderProps {
  formSchema: any
  formId: number
  onSubmitUrl?: string
  submitButtonText?: string
  initialData?: Record<string, any> // Initial form data to populate
  onFormReady?: (formInstance: any) => void // Callback when form is ready
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
  onFormReady,
}: FormIORenderProps) {
  const { formRef, isLoading, error, isSubmitted, submitMessage, formInstance  } = useFormIO({
    formSchema,
    formId,
    onSubmitUrl,
    initialData
  })

  useEffect(() => {
    if (formInstance && onFormReady) {
      onFormReady(formInstance)
    }
  }, [formInstance])
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
          data-formio-mount
          className={isLoading ? 'hidden' : ''}
          style={{ minHeight: '200px' }}
        />
      </div>
    </>
  )
}
