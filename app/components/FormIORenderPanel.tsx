'use client'

import { useEffect, useRef, useState } from 'react'
import { registerCustomComponents } from './formio/custom-components'

export default function FormIORenderPanel({
  formSchema,
  initialData,
  initialStep,
  onFormReady
}: any) {
  const formRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<any>(null)
  const creatingRef = useRef(false)
  const [containerReady, setContainerReady] = useState(false)

  useEffect(() => {
    if (formRef.current) setContainerReady(true)
  }, [])

  useEffect(() => {
    if (!containerReady || !formSchema) return
    if (instanceRef.current || creatingRef.current) return

    creatingRef.current = true
    let isMounted = true

    const init = async () => {
      const { Formio } = await import('formiojs')
      await registerCustomComponents(Formio)
      if (formRef.current) formRef.current.innerHTML = ''
      const instance = await Formio.createForm(formRef.current!, formSchema, {
        renderMode: 'form',
        readOnly: false,
        viewAsHtml: false
      })
      if (!isMounted) return
      instanceRef.current = instance
      creatingRef.current = false
      onFormReady?.(instance)
    }

    init()

    return () => {
      isMounted = false
      if (instanceRef.current) {
        instanceRef.current.destroy(true)
        instanceRef.current = null
        creatingRef.current = false
      }
      if (formRef.current) formRef.current.innerHTML = ''
    }
  }, [containerReady, formSchema])

  return <div ref={formRef} data-formio-mount />
}
