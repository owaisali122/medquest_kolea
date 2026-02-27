'use client'

import { useEffect, useRef, useState } from 'react'
import { FormIOCSSLoader } from './FormIOCSSLoader'
import { FormLoading } from './FormLoading'
import { FormError } from './FormError'
import { registerCustomComponents } from './custom-components'

function useStableCallback<T extends (...args: any[]) => any>(fn: T): T {
  const ref = useRef(fn)
  ref.current = fn
  return useRef(((...args: any[]) => ref.current(...args)) as T).current
}

export interface FormIOFormOptions {
  readOnly?: boolean
  noAlerts?: boolean
  buttonSettings?: Record<string, boolean>
  [key: string]: any
}

export interface FormIOFormProps {
  /** Pre-loaded form schema (use when parent fetches schema). */
  schema?: object
  /** API URL to fetch schema from (e.g. GET /api/forms/get-by-slug?slug=wizard or /api/forms/:id). */
  formUrl?: string
  /** Initial submission data for pre-filling. */
  initialData?: Record<string, any>
  /** Form read-only mode. Default false. */
  readOnly?: boolean
  /** Additional options passed to Formio.createForm. */
  options?: FormIOFormOptions
  /** Called when the form instance is created and ready. */
  onFormReady?: (formInstance: any) => void
  /** Called when the form is submitted. */
  onSubmit?: (submission: any) => void
}

/**
 * Renders a Form.io form from schema or from an API URL.
 * Registers custom components (fieldReference, appDetailRef, etc.) before rendering.
 * Uses Formio.createForm and destroys the instance on unmount or when schema/options change.
 */
export default function FormIOForm({
  schema: schemaProp,
  formUrl,
  initialData,
  readOnly = false,
  options = {},
  onFormReady,
  onSubmit,
}: FormIOFormProps) {
  const formRef = useRef<HTMLDivElement>(null)
  const formInstanceRef = useRef<any>(null)
  const [fetchedSchema, setFetchedSchema] = useState<object | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [initError, setInitError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const onFormReadyStable = useStableCallback(onFormReady ?? (() => {}))
  const onSubmitStable = useStableCallback(onSubmit ?? (() => {}))

  const displaySchema = schemaProp ?? fetchedSchema

  // Fetch schema from API when formUrl is provided and no schema prop
  useEffect(() => {
    if (formUrl && !schemaProp) {
      setFetchError(null)
      setFetchedSchema(null)
      let cancelled = false
      fetch(formUrl)
        .then((res) => {
          if (!res.ok) throw new Error(res.statusText || 'Failed to load form')
          return res.json()
        })
        .then((data) => {
          if (cancelled) return
          const schema = data.schema ?? data
          setFetchedSchema(schema && typeof schema === 'object' ? schema : null)
          if (!schema || typeof schema !== 'object') {
            setFetchError('Invalid form schema response')
          }
        })
        .catch((err) => {
          if (!cancelled) setFetchError(err?.message ?? 'Failed to load form')
        })
      return () => {
        cancelled = true
      }
    }
    if (schemaProp) {
      setFetchedSchema(null)
      setFetchError(null)
    }
  }, [formUrl, schemaProp])

  // Create form when we have a schema and mount ref
  useEffect(() => {
    if (typeof window === 'undefined' || !displaySchema || !formRef.current) {
      if (!formUrl || fetchError !== null || (schemaProp === undefined && fetchedSchema === null)) {
        setIsLoading(false)
      }
      return
    }

    let mounted = true
    setInitError(null)
    setIsLoading(true)

    const init = async () => {
      try {
        await registerCustomComponents()

        let Formio = (window as any).Formio
        if (!Formio?.createForm) {
          const mod = await import('formiojs')
          Formio = (mod as any).Formio ?? (mod as any).default?.Formio ?? (mod as any).default
        }
        if (!Formio?.createForm) {
          throw new Error('Formio not available')
        }

        const schema = JSON.parse(JSON.stringify(displaySchema))
        const formOptions: any = {
          readOnly: readOnly ?? false,
          noAlerts: true,
          ...options,
        }
        if (initialData && Object.keys(initialData).length > 0) {
          formOptions.submission = { data: initialData }
        }
        // So fieldReference/appDetailRef can resolve referenceKey during attach() (before _formSchema is set)
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

        onFormReadyStable(form)
        form.on('submit', (submission: any) => onSubmitStable(submission))

        setIsLoading(false)
      } catch (err: any) {
        if (mounted) {
          setInitError(err?.message ?? 'Failed to initialize form')
          setIsLoading(false)
        }
      }
    }

    init()

    return () => {
      mounted = false
      if (formRef.current && (formRef.current as any).formio) {
        delete (formRef.current as any).formio
      }
      if (formInstanceRef.current) {
        try {
          formInstanceRef.current.destroy()
        } catch {
          // ignore
        }
        formInstanceRef.current = null
      }
    }
  }, [displaySchema, readOnly, initialData, options])

  if (fetchError) return <FormError message={fetchError} />
  if (initError) return <FormError message={initError} />
  if (!displaySchema && (formUrl || schemaProp)) {
    return (
      <>
        <FormIOCSSLoader />
        <FormLoading />
      </>
    )
  }
  if (!displaySchema) {
    return (
      <FormError message="Provide either schema or formUrl to render a form." />
    )
  }

  return (
    <>
      <FormIOCSSLoader />
      {isLoading && <FormLoading />}
      <div
        ref={formRef}
        data-formio-mount
        className={isLoading ? 'hidden' : ''}
        style={{ minHeight: '200px' }}
      />
    </>
  )
}
