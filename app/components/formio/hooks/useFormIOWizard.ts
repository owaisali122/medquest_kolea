'use client'

import { useEffect, useRef, useState } from 'react'
import { registerCustomComponents } from '../custom-components'

interface UseFormIOWizardOptions {
  formSchema: any
  formId: number
  initialData?: Record<string, any>
  onFormReady?: (formInstance: any) => void
  onValidSubmit: (data: Record<string, any>) => void | Promise<void>
}

interface UseFormIOWizardReturn {
  formRef: React.RefObject<HTMLDivElement | null>
  isLoading: boolean
  error: string | null
  formInstance: any
}

export function useFormIOWizard({
  formSchema,
  formId,
  initialData,
  onFormReady,
  onValidSubmit,
}: UseFormIOWizardOptions): UseFormIOWizardReturn {
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
        if (typeof window === 'undefined') {
          throw new Error('FormIO can only be loaded in browser environment')
        }

        await registerCustomComponents()

        const formioModule: any = await import('formiojs')
        let FormClass: any =
          formioModule.Form ||
          formioModule.default?.Form ||
          (typeof formioModule.default === 'function' ? formioModule.default : null)

        if (!FormClass) {
          throw new Error('Could not find Form in formiojs module')
        }

        if (formInstanceRef.current) {
          try {
            formInstanceRef.current.destroy()
          } catch (e) {
            // ignore
          }
        }
        if (formRef.current) {
          formRef.current.innerHTML = ''
        }

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
          try {
            instance.submission = { data: initialData }
          } catch (e) {
            // ignore
          }
        }

        formInstanceRef.current = instance
        if (formRef.current) (formRef.current as any).formio = instance
        onFormReady?.(instance)
      } catch (err: any) {
        if (mounted) {
          setError(err?.message || 'Failed to load form')
        }
      } finally {
        if (mounted) setIsLoading(false)
      }
    }

    initForm()
    return () => {
      mounted = false
      if (formInstanceRef.current) {
        try {
          formInstanceRef.current.destroy()
        } catch (e) {
          // ignore
        }
        formInstanceRef.current = null
      }
    }
  }, [formSchema, formId])

  return {
    formRef,
    isLoading,
    error,
    formInstance: formInstanceRef.current,
  }
}
