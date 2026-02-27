'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { registerCustomComponents } from '../custom-components'

export interface UseFormIOGenericOptions {
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

export interface UseFormIOGenericReturn {
  formRef: React.RefObject<HTMLDivElement | null>
  isLoading: boolean
  error: string | null
  currentPage: number
  totalPages: number
  isSaving: boolean
  handlePrevious: () => void
  handleNext: () => void
  handleSaveExit: () => void
}

export function useFormIOGeneric({
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
}: UseFormIOGenericOptions): UseFormIOGenericReturn {
  const formRef = useRef<HTMLDivElement>(null)
  const formInstanceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [isSaving, setIsSaving] = useState(false)

  const getState = useCallback(() => ({
    formInstanceRef,
    formId,
    recordId: recordId ?? null,
    currentPage,
    totalPages,
  }), [formId, recordId, currentPage, totalPages])

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

        let Formio = (window as any).Formio
        if (!Formio?.createForm) {
          const mod = await import('formiojs')
          Formio = (mod as any).Formio || (mod as any).default?.Formio || (mod as any).default
        }
        if (!Formio?.createForm) throw new Error('FormIO not available')

        const schema = JSON.parse(JSON.stringify(formSchema))
        schema.settings = { ...(schema.settings || {}), wizardHeaderType: 'Vertical' }
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
          allowPrevious: true,
          breadcrumbSettings: { clickable: true },
        }

        if (initialData && Object.keys(initialData).length > 0) {
          formOptions.submission = { data: initialData }
        }
        // So fieldReference/appDetailRef can resolve referenceKey during attach()
        formOptions.form = schema

        const form = await Formio.createForm(formRef.current!, schema, formOptions)
        ;(form as any)._formSchema = schema
        if (form.ready) await form.ready

        if (!mounted) {
          form.destroy()
          return
        }
        formInstanceRef.current = form
        if (formRef.current) (formRef.current as any).formio = form

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

        if (initialData && Object.keys(initialData).length > 0) {
          try {
            form.setSubmission?.({ data: { ...initialData } }, { noValidate: true })
          } catch { /* ignore */ }
        }
        updateStepStyles()

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
        } catch {
          // ignore
        }
      }
    }
  }, [formSchema, formId, initialPage])

  return {
    formRef,
    isLoading,
    error,
    currentPage,
    totalPages,
    isSaving,
    handlePrevious,
    handleNext,
    handleSaveExit,
  }
}
