'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import FormIORender from '@/app/components/FormIORender'
import { FormIOCSSLoader } from '@/app/components/formio/FormIOCSSLoader'
import {
  useAppDispatch,
  useAppSelector,
  setCurrentStep,
  updateFormData,
  setFormData,
  setRecordId,
  setLoading,
  setSaving,
  markSaved,
} from '@/lib/store'

interface ButtonObject {
  type?: string
  action?: string
  label?: string
  key?: string
  customClass?: string
  size?: string
  block?: boolean
  disabled?: boolean
  [key: string]: any
}

interface TabData {
  key: string
  label: string
  components: any[]
  buttons?: ButtonObject[]
}

interface FormIOTabsWrapperProps {
  formSchema: any
  formId: number
  submitButtonText?: string
  initialData?: Record<string, any>
  recordId?: number | null
  initialTab?: number
}

/**
 * Extracts tabs and button objects from FormIO schema
 */
function parseTabsSchema(schema: any): TabData[] {
  const tabs: TabData[] = []
  
  if (!schema || !schema.components) {
    return tabs
  }

  // Find tabs component
  const tabsComponent = schema.components.find((comp: any) => 
    comp.type === 'tabs' || comp.type === 'panel'
  )

  if (!tabsComponent || !tabsComponent.components) {
    return tabs
  }

  // Extract each tab/panel
  tabsComponent.components.forEach((tab: any, index: number) => {
    const tabKey = tab.key || tab.id || `tab-${index}`
    const tabLabel = tab.label || tab.title || `Tab ${index + 1}`
    
    // Find button components in this tab
    const buttons: ButtonObject[] = []
    
    const findButtons = (components: any[]): void => {
      components.forEach((comp: any) => {
        // Check for custom tabnavigationbuttons component
        if (comp.type === 'tabnavigationbuttons') {
          // Extract buttons from the custom component
          // Buttons might be stored in comp.buttons, comp.data.buttons, or comp.components
          if (comp.buttons && Array.isArray(comp.buttons)) {
            comp.buttons.forEach((btn: any) => {
              buttons.push({
                type: btn.type || 'button',
                action: btn.action || btn.data?.action || 'button',
                label: btn.label || btn.title || 'Button',
                key: btn.key || btn.id,
                customClass: btn.customClass || btn.className,
                size: btn.size || 'md',
                block: btn.block || false,
                disabled: btn.disabled || false,
                ...btn
              })
            })
          } else if (comp.data?.buttons && Array.isArray(comp.data.buttons)) {
            comp.data.buttons.forEach((btn: any) => {
              buttons.push({
                type: btn.type || 'button',
                action: btn.action || btn.data?.action || 'button',
                label: btn.label || btn.title || 'Button',
                key: btn.key || btn.id,
                customClass: btn.customClass || btn.className,
                size: btn.size || 'md',
                block: btn.block || false,
                disabled: btn.disabled || false,
                ...btn
              })
            })
          } else if (comp.components && Array.isArray(comp.components)) {
            // Buttons might be nested inside the custom component
            comp.components.forEach((btn: any) => {
              if (btn.type === 'button' || btn.type === 'submit') {
                buttons.push({
                  type: btn.type,
                  action: btn.action || btn.data?.action || 'button',
                  label: btn.label || btn.title || 'Button',
                  key: btn.key || btn.id,
                  customClass: btn.customClass || btn.className,
                  size: btn.size || 'md',
                  block: btn.block || false,
                  disabled: btn.disabled || false,
                  ...btn
                })
              }
            })
          }
        }
        // Check for regular button components
        else if (comp.type === 'button' || comp.type === 'submit') {
          buttons.push({
            type: comp.type,
            action: comp.action || comp.data?.action || 'button',
            label: comp.label || comp.title || 'Button',
            key: comp.key || comp.id,
            customClass: comp.customClass || comp.className,
            size: comp.size || 'md',
            block: comp.block || false,
            disabled: comp.disabled || false,
            ...comp
          })
        }
        // Recursively search in nested components
        if (comp.components && Array.isArray(comp.components)) {
          findButtons(comp.components)
        }
      })
    }

    if (tab.components) {
      findButtons(tab.components)
    }
    
    // Debug: Log found buttons (only in development)
    if (process.env.NODE_ENV === 'development') {
      if (buttons.length > 0) {
        console.log(`[FormIOTabsWrapper] Found ${buttons.length} custom buttons for tab "${tabLabel}"`)
      } else {
        console.log(`[FormIOTabsWrapper] No custom buttons found for tab "${tabLabel}" - using default buttons`)
      }
    }

    tabs.push({
      key: tabKey,
      label: tabLabel,
      components: tab.components || [],
      buttons
    })
  })

  return tabs
}

/**
 * Creates a modified schema for a specific tab
 */
function createTabSchema(originalSchema: any, tabIndex: number, tabs: TabData[]): any {
  if (!tabs[tabIndex]) {
    return originalSchema
  }

  const tab = tabs[tabIndex]
  
  // Create a new schema with only the current tab's components
  const modifiedSchema = {
    ...originalSchema,
    components: tab.components || []
  }

  return modifiedSchema
}

export function FormIOTabsWrapper({
  formSchema,
  formId,
  submitButtonText = 'Submit',
  initialData,
  recordId: propRecordId,
  initialTab = 0,
}: FormIOTabsWrapperProps) {
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  
  // Get state from Redux store
  const currentTab = useAppSelector((state) => state.stepper.currentStep)
  const formData = useAppSelector((state) => state.stepper.formData)
  const recordId = useAppSelector((state) => state.stepper.recordId)
  const isLoading = useAppSelector((state) => state.stepper.isLoading)
  const isSaving = useAppSelector((state) => state.stepper.isSaving)
  
  const [tabs, setTabs] = useState<TabData[]>([])
  const [dataLoadedKey, setDataLoadedKey] = useState(0)
  const isInitialized = useRef(false)
  const formDataRef = useRef<Record<string, any>>({})
  
  // Keep formDataRef in sync with Redux state
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  // Initialize from URL and load saved data
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const initializeTabs = async () => {
      dispatch(setLoading(true))
      
      // Check for record ID in query params or props
      let urlRecordId = searchParams.get('id') || propRecordId?.toString()
      const urlTab = searchParams.get('tab')
      
      // No record ID = fresh form
      if (!urlRecordId) {
        dispatch(setCurrentStep(initialTab >= 0 ? initialTab : 0))
        dispatch(setFormData(initialData || {}))
        dispatch(setRecordId(null))
        formDataRef.current = initialData || {}
        dispatch(setLoading(false))
        return
      }
      
      // Have record ID - load from database
      const recordIdNum = parseInt(urlRecordId, 10)
      dispatch(setRecordId(recordIdNum))
      
      try {
        const response = await fetch(`/api/forms/get-session-state?recordId=${recordIdNum}`)
        
        if (response.ok) {
          const state = await response.json()
          
          if (state.hasSavedState) {
            if (state.data && Object.keys(state.data).length > 0) {
              dispatch(setFormData(state.data))
              formDataRef.current = state.data
              setDataLoadedKey(prev => prev + 1)
            }
            
            // Determine which tab to show
            let tabToUse = 0
            if (urlTab !== null) {
              tabToUse = parseInt(urlTab, 10)
            } else if (state.currentPage !== null && state.currentPage >= 0) {
              tabToUse = state.currentPage
            } else if (state.metadata?.currentStepIndex !== undefined) {
              tabToUse = state.metadata.currentStepIndex
            } else if (initialTab > 0) {
              tabToUse = initialTab
            }
            
            dispatch(setCurrentStep(tabToUse >= 0 ? tabToUse : 0))
          } else {
            const tabToUse = urlTab ? parseInt(urlTab, 10) : initialTab
            dispatch(setCurrentStep(tabToUse >= 0 ? tabToUse : 0))
          }
        } else {
          const tabToUse = urlTab ? parseInt(urlTab, 10) : initialTab
          dispatch(setCurrentStep(tabToUse >= 0 ? tabToUse : 0))
        }
      } catch (error) {
        console.error('Error loading saved data:', error)
        const tabToUse = urlTab ? parseInt(urlTab, 10) : initialTab
        dispatch(setCurrentStep(tabToUse >= 0 ? tabToUse : 0))
      } finally {
        dispatch(setLoading(false))
      }
    }

    initializeTabs()
  }, [dispatch, searchParams, propRecordId, initialTab, initialData])

  // Parse tabs from schema
  useEffect(() => {
    const parsedTabs = parseTabsSchema(formSchema)
    setTabs(parsedTabs)
    // Set total steps in Redux
    if (parsedTabs.length > 0) {
      // We'll use the stepper slice's setTotalSteps if needed, but for now just ensure currentStep is valid
      if (currentTab >= parsedTabs.length) {
        dispatch(setCurrentStep(0))
      }
    }
  }, [formSchema, currentTab, dispatch])

  // Get current tab data
  const currentTabData = tabs[currentTab] || null
  const currentTabSchema = currentTabData 
    ? createTabSchema(formSchema, currentTab, tabs)
    : formSchema

  // Capture form data from DOM (similar to stepper forms)
  // This must be defined before handlers that use it
  const captureFormData = useCallback((): Record<string, any> => {
    try {
      const formContainer = document.querySelector(`.formio-tabs-form-${formId}`)
      if (!formContainer) return {}

      const formElement = formContainer.querySelector('.formio-container')
      if (!formElement) return {}

      const extractedData: Record<string, any> = {}

      // Clean field name helper (removes FormIO's data[] wrapper)
      const cleanFieldName = (name: string): string => {
        if (!name) return name
        if (name.startsWith('data[') && name.endsWith(']')) {
          return name.substring(5, name.length - 1)
        } else if (name.startsWith('data.')) {
          return name.substring(5)
        }
        return name
      }

      // Extract from DOM inputs
      const inputs = formElement.querySelectorAll('input, textarea, select')
      inputs.forEach((input) => {
        const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
        const name = element.getAttribute('name') || element.id
        if (!name) return

        const cleanName = cleanFieldName(name)
        
        // Skip button values and internal FormIO fields
        if (cleanName === 'submit' || cleanName === 'cancel' || cleanName.startsWith('_') || cleanName.startsWith('$')) {
          return
        }

        if (element.type === 'checkbox') {
          const checkbox = element as HTMLInputElement
          extractedData[cleanName] = checkbox.checked
        } else if (element.type === 'radio') {
          const radio = element as HTMLInputElement
          if (radio.checked) {
            extractedData[cleanName] = radio.value
          }
        } else {
          extractedData[cleanName] = element.value
        }
      })

      return extractedData
    } catch (error) {
      console.error('Error capturing form data:', error)
      return {}
    }
  }, [formId])

  // Handle Save & Exit button
  const handleSaveAndExit = useCallback(async () => {
    dispatch(setSaving(true))
    try {
      // Capture current form data
      const data = captureFormData()
      const allData = { ...formData, ...data }
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[FormIOTabsWrapper] Saving form data:', {
          formId,
          stepIndex: currentTab,
          recordId: recordId || null,
          dataKeys: Object.keys(allData).length,
        })
      }
      
      // Update Redux state
      dispatch(setFormData(allData))
      
      // Save to API
      const response = await fetch('/api/forms/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          stepIndex: currentTab,
          data: allData,
          recordId: recordId || null
        })
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('[FormIOTabsWrapper] Save response:', {
          status: response.status,
          ok: response.ok,
        })
      }

      if (!response.ok) {
        const errorText = await response.text()
        console.error('FormIOTabsWrapper: Save failed - response text:', errorText)
        throw new Error(`Failed to save: ${response.status} ${response.statusText}`)
      }

      let result: any
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error('FormIOTabsWrapper: Failed to parse save response JSON:', jsonError)
        throw new Error('Invalid response from server')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[FormIOTabsWrapper] Save result:', {
          success: result.success,
          recordId: result.recordId,
        })
      }

      if (!result.success && result.error) {
        console.error('FormIOTabsWrapper: Save returned error:', result.error, result.details)
        throw new Error(result.details || result.error || 'Failed to save form')
      }
      
      // Update recordId in Redux if this was a new record
      if (result.recordId && !recordId) {
        dispatch(setRecordId(result.recordId))
        // Update URL with new record ID
        const url = new URL(window.location.href)
        url.searchParams.set('id', result.recordId.toString())
        window.history.replaceState({}, '', url.toString())
        if (process.env.NODE_ENV === 'development') {
          console.log('[FormIOTabsWrapper] Updated recordId:', result.recordId)
        }
      }
      
      dispatch(markSaved())

      // Redirect to listing page
      window.location.href = '/forms/formio-tab/list'
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to save. Please try again.'
      console.error('FormIOTabsWrapper: Save error:', {
        error: errorMessage,
        stack: error.stack,
      })
      alert(`Failed to save: ${errorMessage}`)
    } finally {
      dispatch(setSaving(false))
    }
  }, [formId, currentTab, formData, recordId, captureFormData, dispatch])

  // Handle Previous button
  const handlePrevious = useCallback(() => {
    if (currentTab > 0) {
      const data = captureFormData()
      const allData = { ...formData, ...data }
      
      // Update Redux state
      dispatch(updateFormData(data))
      
      dispatch(setCurrentStep(currentTab - 1))
    }
  }, [currentTab, formData, captureFormData, dispatch])

  // Handle Next button
  const handleNext = useCallback(() => {
    if (currentTab < tabs.length - 1) {
      const data = captureFormData()
      const allData = { ...formData, ...data }
      
      // Update Redux state
      dispatch(updateFormData(data))
      
      dispatch(setCurrentStep(currentTab + 1))
    }
  }, [currentTab, tabs.length, formData, captureFormData, dispatch])

  // Handle Submit button
  const handleSubmit = useCallback(async () => {
    dispatch(setSaving(true))
    try {
      // Capture current form data
      const data = captureFormData()
      const allData = { ...formData, ...data }

      if (process.env.NODE_ENV === 'development') {
        console.log('[FormIOTabsWrapper] Submitting form:', {
          formId,
          dataKeys: Object.keys(allData).length,
        })
      }

      // Update Redux state
      dispatch(setFormData(allData))

      // Submit to API
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          data: allData
        })
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('[FormIOTabsWrapper] Submit response:', {
          status: response.status,
          ok: response.ok,
        })
      }

      let result: any
      try {
        result = await response.json()
      } catch (jsonError) {
        console.error('FormIOTabsWrapper: Failed to parse response JSON:', jsonError)
        const text = await response.text()
        console.error('FormIOTabsWrapper: Response text:', text)
        throw new Error('Invalid response from server')
      }

      if (process.env.NODE_ENV === 'development') {
        console.log('[FormIOTabsWrapper] Submit result:', {
          success: result.success,
          submissionId: result.submissionId,
        })
      }

      if (!response.ok) {
        const errorMessage = result.error || result.details || `Server error: ${response.status} ${response.statusText}`
        console.error('FormIOTabsWrapper: Submit failed:', {
          status: response.status,
          statusText: response.statusText,
          error: result.error,
          details: result.details,
        })
        throw new Error(errorMessage)
      }

      if (!result.success && result.error) {
        console.error('FormIOTabsWrapper: Submit returned error:', result.error, result.details)
        throw new Error(result.details || result.error || 'Failed to submit form')
      }

      const message = result.message || 'Form submitted successfully!'
      
      dispatch(markSaved())
      
      // Show success message and redirect
      alert(message)
      window.location.href = '/forms/formio-tab/list'
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to submit. Please try again.'
      console.error('FormIOTabsWrapper: Submit error:', {
        error: errorMessage,
        stack: error.stack,
      })
      alert(`Failed to submit: ${errorMessage}`)
    } finally {
      dispatch(setSaving(false))
    }
  }, [formId, formData, captureFormData, dispatch])

  // Handle button click based on action
  const handleButtonClick = useCallback((button: ButtonObject) => {
    const action = button.action?.toLowerCase() || 'button'
    
    switch (action) {
      case 'saveandexit':
      case 'save & exit':
      case 'saveexit':
        handleSaveAndExit()
        break
      case 'previous':
      case 'prev':
        handlePrevious()
        break
      case 'next':
        handleNext()
        break
      case 'submit':
        handleSubmit()
        break
      default:
        console.log('Button action not handled:', action)
    }
  }, [handleSaveAndExit, handlePrevious, handleNext, handleSubmit])

  // Render button based on button object
  const renderButton = (button: ButtonObject, index: number) => {
    const action = button.action?.toLowerCase() || 'button'
    const label = button.label || 'Button'
    const isDisabled = button.disabled || isSaving || 
      (action === 'previous' && currentTab === 0) ||
      (action === 'next' && currentTab === tabs.length - 1)

    // Determine button styling based on action
    let buttonClass = 'px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2'
    
    if (action === 'submit') {
      buttonClass += ' bg-green-600 text-white hover:bg-green-700'
    } else if (action === 'saveandexit' || action === 'save & exit' || action === 'saveexit') {
      buttonClass += ' bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
    } else if (action === 'previous' || action === 'prev') {
      buttonClass += currentTab === 0 
        ? ' bg-gray-100 text-gray-400 cursor-not-allowed'
        : ' bg-gray-200 text-gray-700 hover:bg-gray-300'
    } else if (action === 'next') {
      buttonClass += currentTab === tabs.length - 1
        ? ' bg-gray-100 text-gray-400 cursor-not-allowed'
        : ' bg-blue-600 text-white hover:bg-blue-700'
    } else {
      buttonClass += ' bg-gray-200 text-gray-700 hover:bg-gray-300'
    }

    if (isDisabled) {
      buttonClass += ' opacity-50 cursor-not-allowed'
    }

    // Add custom class if provided
    if (button.customClass) {
      buttonClass += ` ${button.customClass}`
    }

    return (
      <button
        key={button.key || `btn-${index}`}
        onClick={() => !isDisabled && handleButtonClick(button)}
        disabled={isDisabled}
        className={buttonClass}
      >
        {isSaving && (action === 'submit' || action === 'saveandexit' || action === 'save & exit' || action === 'saveexit') ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {action === 'submit' ? 'Submitting...' : 'Saving...'}
          </>
        ) : (
          <>
            {action === 'previous' || action === 'prev' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : action === 'next' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : action === 'saveandexit' || action === 'save & exit' || action === 'saveexit' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            ) : null}
            {label}
          </>
        )}
      </button>
    )
  }

  if (isLoading) {
    return (
      <div className="min-h-[400px] flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-4"></div>
          <p className="text-gray-600">Loading saved form data...</p>
        </div>
      </div>
    )
  }

  if (tabs.length === 0) {
    // Fallback to regular form render if no tabs found
    return (
      <>
        <FormIOCSSLoader />
        <FormIORender
          formSchema={formSchema}
          formId={formId}
          submitButtonText={submitButtonText}
          initialData={formData}
          stepIndex={0}
          recordId={recordId}
          useSaveStep={true}
        />
      </>
    )
  }

  return (
    <>
      <FormIOCSSLoader />
      
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-gray-50 mb-6">
        <nav className="flex overflow-x-auto" aria-label="Tabs">
          {tabs.map((tab, index) => {
            const isActive = index === currentTab
            const isCompleted = index < currentTab

            return (
              <button
                key={tab.key}
                onClick={() => {
                  const data = captureFormData()
                  const allData = { ...formData, ...data }
                  
                  // Update Redux state
                  dispatch(updateFormData(data))
                  
                  dispatch(setCurrentStep(index))
                }}
                disabled={isSaving}
                className={`group relative min-w-0 flex-1 overflow-hidden py-4 px-6 text-sm font-medium text-center transition-all duration-200 focus:z-10 focus:outline-none ${
                  isActive
                    ? 'text-blue-600 bg-white border-b-2 border-blue-600'
                    : isCompleted
                    ? 'text-green-600 bg-white/50 hover:bg-white hover:text-green-700'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-white/50'
                } ${isSaving ? 'cursor-not-allowed opacity-50' : ''}`}
              >
                <div className="flex items-center justify-center gap-2">
                  {isCompleted && (
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                  <span>{tab.label}</span>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Form Content */}
      <div className="mb-6">
        <style
          dangerouslySetInnerHTML={{
            __html: `
              .formio-tabs-form-${formId} button[type="submit"],
              .formio-tabs-form-${formId} button[data-action="submit"],
              .formio-tabs-form-${formId} button[data-action="cancel"],
              .formio-tabs-form-${formId} button.cancel,
              .formio-tabs-form-${formId} .formio-actions button[type="submit"],
              .formio-tabs-form-${formId} .formio-actions button[data-action="cancel"] {
                display: none !important;
              }
            `,
          }}
        />
        <div className={`formio-tabs-form-${formId}`}>
          <FormIORender
            key={`tab-${currentTab}-${formId}-${dataLoadedKey}`}
            formSchema={currentTabSchema}
            formId={formId}
            submitButtonText={submitButtonText}
            initialData={formData}
            stepIndex={currentTab}
            recordId={recordId}
            useSaveStep={true}
          />
        </div>
      </div>

      {/* Custom Navigation Buttons */}
      {(() => {
        if (!currentTabData || !currentTabData.buttons || currentTabData.buttons.length === 0) {
          // Render default buttons if no custom buttons found
          return (
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="flex gap-3">
                <button
                  onClick={handleSaveAndExit}
                  disabled={isSaving}
                  className={`px-5 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                    isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50 hover:border-gray-400'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      Save & Exit
                    </>
                  )}
                </button>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handlePrevious}
                  disabled={currentTab === 0 || isSaving}
                  className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    currentTab === 0 || isSaving
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                  </svg>
                  Previous
                </button>

                {currentTab < tabs.length - 1 ? (
                  <button
                    onClick={handleNext}
                    disabled={isSaving}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      !isSaving
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                  >
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSaving}
                    className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                      !isSaving
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : 'bg-gray-400 text-gray-200 cursor-not-allowed'
                    }`}
                  >
                    {isSaving ? (
                      <>
                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Submitting...
                      </>
                    ) : (
                      <>
                        Submit
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          )
        }
        
        // Render custom buttons from schema
        return (
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <div className="flex gap-3">
              {currentTabData.buttons
                .filter(btn => {
                  const action = btn.action?.toLowerCase() || ''
                  return action === 'saveandexit' || action === 'save & exit' || action === 'saveexit'
                })
                .map((button, index) => renderButton(button, index))}
            </div>

            <div className="flex gap-3">
              {currentTabData.buttons
                .filter(btn => {
                  const action = btn.action?.toLowerCase() || ''
                  return action === 'previous' || action === 'prev' || action === 'next'
                })
                .map((button, index) => renderButton(button, index))}
              
              {currentTabData.buttons
                .filter(btn => {
                  const action = btn.action?.toLowerCase() || ''
                  return action === 'submit'
                })
                .map((button, index) => renderButton(button, index))}
            </div>
          </div>
        )
      })()}
    </>
  )
}
