'use client'

import { useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { TabsButtonsWrapper as TabsButtonsWrapperComponent } from '../TabsButtonsWrapper'

interface TabsButtonsWrapperProps {
  formSchema: any
  formId: number
  submitButtonText?: string
  recordId: string
  initialTab?: number
}

export function TabsButtonsWrapper({ 
  formSchema, 
  formId, 
  submitButtonText, 
  recordId,
  initialTab = 0 
}: TabsButtonsWrapperProps) {
  const searchParams = useSearchParams()
  
  // Set the URL params for the TabsButtonsWrapper to pick up
  useEffect(() => {
    const url = new URL(window.location.href)
    let needsUpdate = false
    
    // Always set id if not in query params (might be in path)
    if (!url.searchParams.has('id')) {
      url.searchParams.set('id', recordId)
      needsUpdate = true
    }
    
    // Only set tab if initialTab is provided and different from current
    // This prevents overwriting the tab during initialization
    if (initialTab !== undefined && initialTab !== null && initialTab >= 0) {
      const currentTab = url.searchParams.get('tab')
      const currentTabNum = currentTab ? parseInt(currentTab, 10) : null
      
      // Only update if tab is missing or different, and we're setting a non-zero tab
      // This prevents resetting to 0 when user has explicitly set a different tab
      if (currentTabNum === null || (currentTabNum !== initialTab && initialTab > 0)) {
        url.searchParams.set('tab', initialTab.toString())
        needsUpdate = true
      }
    }
    
    if (needsUpdate) {
      window.history.replaceState({}, '', url.toString())
    }
  }, [recordId, initialTab])
  
  return (
    <TabsButtonsWrapperComponent
      formSchema={formSchema}
      formId={formId}
      submitButtonText={submitButtonText}
      initialTab={initialTab}
    />
  )
}
