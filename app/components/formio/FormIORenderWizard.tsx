'use client'

import { FormIOCSSLoader } from './FormIOCSSLoader'
import { FormLoading } from './FormLoading'
import { FormError } from './FormError'
import { useFormIOWizard } from './hooks/useFormIOWizard'

interface FormIORenderWizardProps {
  formSchema: any
  formId: number
  initialData?: Record<string, any>
  onFormReady?: (formInstance: any) => void
  onValidSubmit: (data: Record<string, any>) => void | Promise<void>
}

export default function FormIORenderWizard({
  formSchema,
  formId,
  initialData,
  onFormReady,
  onValidSubmit,
}: FormIORenderWizardProps) {
  const { formRef, isLoading, error } = useFormIOWizard({
    formSchema,
    formId,
    initialData,
    onFormReady,
    onValidSubmit,
  })

  if (error) {
    return <FormError message={error} />
  }

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
