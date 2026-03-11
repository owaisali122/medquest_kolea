'use client'

import { useEffect, useRef, useState } from 'react'
import { FormIOCSSLoader } from '@/app/components/formio/FormIOCSSLoader'
import { FormLoading } from '@/app/components/formio/FormLoading'
import { FormError } from '@/app/components/formio/FormError'
import { registerCustomComponents } from '@/app/components/formio/custom-components'

interface Props {
  formSchema: any
  formId: number
  initialData?: Record<string, any>
  onFormReady?: (formInstance: any) => void
  onValidSubmit: (data: Record<string, any>) => void | Promise<void>
}

export default function FormIORenderWizardLegacy({
  formSchema,
  formId,
  initialData,
  onFormReady,
  onValidSubmit,
}: Props) {
  const formRef = useRef<HTMLDivElement>(null)
  const formInstanceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const onValidSubmitRef = useRef(onValidSubmit)
  onValidSubmitRef.current = onValidSubmit

  useEffect(() => {
    let mounted = true

    const initForm = async () => {
      if (!formRef.current || !formSchema) {
        setIsLoading(false)
        return
      }
      try {
        if (typeof window === 'undefined') throw new Error('FormIO can only be loaded in browser environment')
        const formioModule: any = await import('formiojs')
        await registerCustomComponents(
          (formioModule as any).Formio || (formioModule as any).default?.Formio || (formioModule as any).default
        )
        let FormClass: any =
          formioModule.Form ||
          formioModule.default?.Form ||
          (typeof formioModule.default === 'function' ? formioModule.default : null)

        if (!FormClass) throw new Error('Could not find Form in formiojs module')

        if (formInstanceRef.current) {
          try { formInstanceRef.current.destroy() } catch { /* ignore */ }
        }
        if (formRef.current) formRef.current.innerHTML = ''

        const formOptions: any = {
          readOnly: false,
          noAlerts: false,
          hooks: {
            beforeSubmit: async (submission: any, next: any) => {
              next(false)
              const instance = formInstanceRef.current
              if (instance && typeof instance.checkValidity === 'function') {
                const valid = instance.checkValidity(submission.data, true)
                if (!valid) return
              }
              const cleanData = { ...submission.data }
              delete cleanData.submit
              delete cleanData.cancel
              await onValidSubmitRef.current(cleanData)
            },
          },
        }

        if (initialData && Object.keys(initialData).length > 0) {
          formOptions.submission = { data: initialData }
        }

        const safeSchema = formSchema && typeof formSchema === 'object' ? formSchema : {}
        const schema = {
          ...safeSchema,
          components: Array.isArray(safeSchema.components) ? safeSchema.components : [],
        }
        const form = new FormClass(formRef.current, schema, formOptions)
        const instance = await form.ready

        if (!mounted) {
          form.destroy()
          return
        }

        if (initialData && typeof initialData === 'object' && Object.keys(initialData).length > 0) {
          try { instance.submission = { data: initialData } } catch { /* ignore */ }
        }

        formInstanceRef.current = instance
        if (formRef.current) (formRef.current as any).formio = instance
        onFormReady?.(instance)
      } catch (err: any) {
        if (mounted) setError(err?.message || 'Failed to load form')
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    initForm()
    return () => {
      mounted = false
      if (formInstanceRef.current) {
        try { formInstanceRef.current.destroy() } catch { /* ignore */ }
        formInstanceRef.current = null
      }
    }
  }, [formSchema, formId])

  if (error) return <FormError message={error} />

  return (
    <>
      <FormIOCSSLoader />
      <div className="formio-container">
        {isLoading && <FormLoading />}
        <div ref={formRef} data-formio-mount className={isLoading ? 'hidden' : ''} style={{ minHeight: '200px' }} />
      </div>
    </>
  )
}
