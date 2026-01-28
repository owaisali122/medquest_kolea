'use client'

import { useEffect } from 'react'
import { TabStepperForm } from '@/app/components/stepper/TabStepperForm'
import type { Form } from '@/lib/forms'

interface Step {
  id: string
  title: string
  description?: string
  form?: Form | null
}

interface TabStepperFormWrapperProps {
  steps: Step[]
  initialStep: number
  recordId: string
}

export function TabStepperFormWrapper({ steps, initialStep, recordId }: TabStepperFormWrapperProps) {
  // Set the URL params for the TabStepperForm to pick up
  useEffect(() => {
    const url = new URL(window.location.href)
    if (!url.searchParams.has('id')) {
      url.searchParams.set('id', recordId)
      url.searchParams.set('step', initialStep.toString())
      window.history.replaceState({}, '', url.toString())
    }
  }, [recordId, initialStep])
  
  return <TabStepperForm steps={steps} initialStep={initialStep} />
}
