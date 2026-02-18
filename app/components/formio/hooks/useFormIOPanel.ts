'use client'

import { useEffect, useRef, useState } from 'react'
import { registerCustomComponents } from '../custom-components'

interface Props {
  formSchema: any
  onFormReady?: (instance: any) => void
}

export function useFormIOPanel({ formSchema, onFormReady }: Props) {

  const formRef = useRef<HTMLDivElement>(null)
  const instanceRef = useRef<any>(null)
  const creatingRef = useRef(false)

  const [containerReady, setContainerReady] = useState(false)

  // detect when DOM ref is attached
  useEffect(() => {
    if (formRef.current) {
      setContainerReady(true)
    }
  }, [])

  // create form only when container + schema ready
  useEffect(() => {
    if (!containerReady || !formSchema) return
    if (instanceRef.current || creatingRef.current) return

    creatingRef.current = true
    let isMounted = true

    const init = async () => {
      console.log("FORM CREATED")

      await registerCustomComponents()
      const { Formio } = await import('formiojs')
 // Clear any existing content in the container before creating form
        if (formRef.current) {
          formRef.current.innerHTML = ''
        }
      // const instance = await Formio.createForm(formRef.current!, formSchema)
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
       // Clear container on unmount
       if (formRef.current) {
        formRef.current.innerHTML = ''
      }
    }

  }, [containerReady, formSchema])

  return {
    formRef,
    instanceRef
  }
}
