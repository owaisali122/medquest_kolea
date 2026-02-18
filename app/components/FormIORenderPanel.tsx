'use client'

import { useFormIOPanel } from "./formio/hooks/useFormIOPanel"

 
export default function FormIORender({
  formSchema,
  initialData,
  initialStep,   // ✅ FORWARD
  onFormReady
}: any) {

  const { formRef } = useFormIOPanel({
    formSchema,
    initialData: {},
    initialStep,
    onFormReady
  })

  return (
    <div
      ref={formRef}
      data-formio-mount
    />
  )
}
