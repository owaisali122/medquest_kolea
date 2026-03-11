'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { registerCustomComponents } from '../custom-components'

export interface UseFormIOCoreOptions {
  formSchema: any
  formId: number
  initialData?: Record<string, any>
  initialPage?: number
  maxFilledStep?: number
  /** 'single' hides wizard nav and tracks no pages; 'wizard' enables page tracking. */
  mode?: 'single' | 'wizard'
  onError?: (error: string) => void
}

export interface UseFormIOCoreReturn {
  formRef: React.RefObject<HTMLDivElement | null>
  formInstanceRef: React.MutableRefObject<any>
  isLoading: boolean
  error: string | null
  currentPage: number
  totalPages: number
}

export function useFormIOCore({
  formSchema,
  formId,
  initialData,
  initialPage,
  maxFilledStep,
  mode = 'wizard',
  onError,
}: UseFormIOCoreOptions): UseFormIOCoreReturn {
  const formRef = useRef<HTMLDivElement>(null)
  const formInstanceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)

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

        let Formio = (window as any).Formio
        if (!Formio?.createForm) {
          const mod = await import('formiojs')
          Formio = (mod as any).Formio || (mod as any).default?.Formio || (mod as any).default
        }
        if (!Formio?.createForm) throw new Error('FormIO not available')

        await registerCustomComponents(Formio)

        const schema = JSON.parse(JSON.stringify(formSchema))

        if (mode === 'wizard') {
          schema.settings = { ...(schema.settings || {}), wizardHeaderType: 'Vertical' }
        }

        const hidePanelButtons = { previous: false, next: false, cancel: false, submit: false }
        const setPanelButtons = (comps: any[]) => {
          ;(comps || []).forEach((c: any) => {
            if (c.type === 'panel') c.buttonSettings = { ...(c.buttonSettings || {}), ...hidePanelButtons }
            if (c.components?.length) setPanelButtons(c.components)
          })
        }
        setPanelButtons(schema.components || [])

        const formOptions: any = {
          buttonSettings: { showPrevious: false, showNext: false, showCancel: false, showSubmit: false },
          readOnly: false,
          noAlerts: true,
          form: schema,
        }

        if (mode === 'wizard') {
          formOptions.allowPrevious = true
          formOptions.breadcrumbSettings = { clickable: true }
        }

        if (initialData && Object.keys(initialData).length > 0) {
          formOptions.submission = { data: initialData }
        }

        const form = await Formio.createForm(formRef.current!, schema, formOptions)
        ;(form as any)._formSchema = schema
        if (form.ready) await form.ready

        if (!mounted) {
          form.destroy()
          return
        }
        formInstanceRef.current = form
        if (formRef.current) (formRef.current as any).formio = form

        if (mode === 'wizard') {
          const wizard = form.root || form
          const total = wizard.pages?.length ?? 1
          setTotalPages(total)

          let startPage = wizard.page ?? 0
          if (initialPage != null && initialPage >= 0 && initialPage < total) {
            try {
              if (typeof (wizard as any).setPage === 'function') {
                await (wizard as any).setPage(initialPage)
              }
              startPage = initialPage
            } catch { /* ignore */ }
          }
          const enabledForTabs = (maxFilledStep != null && maxFilledStep >= 0) ? maxFilledStep : startPage
          ;(wizard as any).enabledIndex = Math.min(enabledForTabs, total - 1)
          setCurrentPage(startPage)

          const updateStepStyles = () => {
            if (!mounted || !formRef.current) return
            const header = formRef.current.querySelector('[id$="-header"]') as HTMLElement | null
            if (!header) return
            const w = formInstanceRef.current?.root || formInstanceRef.current
            const currentIdx = (w?.page ?? 0) as number
            header.querySelectorAll('li.page-item').forEach((li, idx) => {
              ;(li as HTMLElement).classList.toggle('step-completed', idx < currentIdx)
            })
          }
          const onPageChange = () => {
            if (!mounted) return
            setCurrentPage((formInstanceRef.current?.root || formInstanceRef.current)?.page ?? 0)
            updateStepStyles()
          }
          wizard.on?.('nextPage', onPageChange)
          wizard.on?.('prevPage', onPageChange)
          wizard.on?.('wizardPageSelected', onPageChange)
          updateStepStyles()
        } else {
          setTotalPages(1)
          setCurrentPage(0)
        }

        if (initialData && Object.keys(initialData).length > 0) {
          try {
            form.setSubmission?.({ data: { ...initialData } }, { noValidate: true })
          } catch { /* ignore */ }
        }

        form.on?.('error', () => {
          setError('Form error occurred. Please check your inputs.')
          setIsLoading(false)
        })

        setIsLoading(false)
      } catch (err: any) {
        setError(err.message || 'Failed to load form. Please refresh the page.')
        setIsLoading(false)
        onError?.(err.message)
      }
    }

    initForm()

    return () => {
      mounted = false
      if (formRef.current) delete (formRef.current as any).formio
      if (formInstanceRef.current) {
        try {
          formInstanceRef.current.destroy()
        } catch { /* ignore */ }
      }
    }
  }, [formSchema, formId, initialPage])

  return {
    formRef,
    formInstanceRef,
    isLoading,
    error,
    currentPage,
    totalPages,
  }
}
