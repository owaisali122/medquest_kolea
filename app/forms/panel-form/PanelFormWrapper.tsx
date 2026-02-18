'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import FormIORenderPanel from '@/app/components/FormIORenderPanel'

export default function PanelFormWrapper({
  formSchema,
  formId,
  recordId,
  initialStep = 1,
  initialData = {} 
}: any) {

  const router = useRouter()
  const formRef = useRef<any>(null)
  const [formReady, setFormReady] = useState(false)

  // 🔥 Maintain active record id locally
  const [activeRecordId, setActiveRecordId] = useState<number | null>(
    recordId ? parseInt(String(recordId), 10) : null
  )
  console.log("PanelFormWrapper render", initialData)

  useEffect(() => {
    console.log('intialdata::')

    if (!formReady || !formRef.current) {
      console.log('Form not ready yet')
      return
    }
    
    if (!initialData || Object.keys(initialData).length === 0) {
      console.log('No initial data to hydrate')
      return
    }
    
    const formInstance = formRef.current
    console.log("HYDRATING FORM WITH DATA")
  
    // Only set submission once when form becomes ready
    formInstance.setSubmission({
      data: {
        ...initialData,
        currentStep: String(initialStep)
      }
    }, { fromSubmission: true })
  
  }, [formReady]) // Remove initialData and initialStep from dependencies to prevent re-hydration

  const saveToAPI = useCallback(
    async (
      dataToSave: Record<string, any>,
      stepIndex: number
    ): Promise<{ success: boolean; recordId?: number }> => {
      if (!formId) {
        console.error('PanelFormWrapper: formId is required for save')
        return { success: false }
      }

      try {
        const response = await fetch('/api/forms/save-step', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formId: typeof formId === 'string' ? parseInt(formId, 10) : formId,
            stepIndex,
            data: dataToSave,
            recordId: activeRecordId, // 🔥 send current id
          }),
        })

        if (!response.ok) return { success: false }

        const result = await response.json()

        return {
          success: true,
          recordId: result.recordId ?? activeRecordId ?? undefined,
        }
      } catch (error) {
        console.error('Save error:', error)
        return { success: false }
      }
    },
    [formId, activeRecordId]
  )
  const handleFormReady = (instance: any) => {
    const formInstance = instance.instance || instance
    
    // Prevent multiple initialization
    if (formRef.current) {
      console.log('Form already initialized, skipping')
      return
    }
    
    formRef.current = formInstance
    
    const totalPanels = formInstance.component.components.filter(
      (component: any) => component.type === 'panel'
    ).length
  
    formInstance.submission.data.totalSteps = totalPanels
  
    formInstance.on('nextPanel', async () => await handleNext())
    formInstance.on('prevPanel', handlePrev)
    formInstance.on('saveExitPanel', handleSaveExist)
    
    setFormReady(true)
  }
  
  
  // const handleFormReady = (instance: any) => {

  //   const formInstance = instance.instance || instance
  //   formRef.current = formInstance

  //   if (!formInstance.submission) {
  //     formInstance.submission = { data: {} }
  //   }

  //   if (!formInstance.submission.data) {
  //     formInstance.submission.data = {}
  //   }

  //   if (initialStep) {
  //     formInstance.submission.data.currentStep = String(initialStep)
  //     formInstance.redraw()
  //   }

  //   formInstance.on('nextPanel', async () => {
  //     await handleNext()
  //   })

  //   formInstance.on('prevPanel', async () => {
  //     handlePrev()
  //   })
  // }

  const handleNext = async () => {

    const instance = formRef.current
    if (!instance) return

    const current = parseInt(instance.submission?.data?.currentStep || 1)
    const nextStep = current + 1

    const dataToSave = {
      ...instance.submission.data,
      currentStep: String(nextStep)
    }

    // 🔥 Save (create or update automatically)
    const result = await saveToAPI(dataToSave, current)
    if (!result.success) return

    const id = result.recordId

    // 🔥 Store recordId if first time created
    if (!activeRecordId && id) {
      setActiveRecordId(id)
    }

    // 🔥 Update form state
    instance.submission.data.currentStep = String(nextStep)
    // instance.redraw()

    // 🔥 Only update URL if id newly created
    if (!activeRecordId && id) {
      router.replace(`/forms/panel-form/${id}/${nextStep}`)
    }
  }
  
  const handleSaveExist = async () => {

    const instance = formRef.current
    if (!instance) return

    const current = parseInt(instance.submission?.data?.currentStep || 1)
 
    const dataToSave = {
      ...instance.submission.data,
      currentStep: String(current)
    }

    // 🔥 Save (create or update automatically)
    const result = await saveToAPI(dataToSave, current)
    if (result.success) router.replace(`/forms/panel-form`)
  }

  const handlePrev = useCallback(() => {
    const instance = formRef.current
    if (!instance) return

    const current = parseInt(instance.submission?.data?.currentStep || 1)
    const prevStep = current - 1
    if (prevStep < 1) return

    instance.submission.data.currentStep = String(prevStep)
    // instance.redraw()
  }, [])

  return (
    <FormIORenderPanel
      formSchema={formSchema}
      initialStep={initialStep}
      onFormReady={handleFormReady}
    />
  )
}
