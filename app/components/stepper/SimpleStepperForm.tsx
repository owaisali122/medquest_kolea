'use client'

import { useEffect, useRef, useCallback, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import FormIORender from '../FormIORender'
import type { Form } from '@/lib/forms'
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

interface Step {
  id: string
  title: string
  description?: string
  form?: Form | null
}

interface SimpleStepperFormProps {
  steps: Step[]
  initialStep?: number
  onStepChange?: (stepIndex: number) => void
  onSaveAndExit?: () => void
  onSubmit?: () => void
}

export function SimpleStepperForm({
  steps,
  initialStep = 0,
  onStepChange,
  onSaveAndExit,
  onSubmit,
}: SimpleStepperFormProps) {
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  
  // Get state from Redux store
  const currentStep = useAppSelector((state) => state.stepper.currentStep)
  const formData = useAppSelector((state) => state.stepper.formData)
  const recordId = useAppSelector((state) => state.stepper.recordId)
  const isLoading = useAppSelector((state) => state.stepper.isLoading)
  const isSaving = useAppSelector((state) => state.stepper.isSaving)
  
  const formContainerRef = useRef<HTMLDivElement | null>(null)
  const isInitialized = useRef(false)
  const [dataLoadedKey, setDataLoadedKey] = useState(0) // Key to force FormIO remount when data loads

  const totalSteps = steps.length
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const currentStepData = steps[currentStep]

  // Initialize stepper from URL on mount
  // Simple logic: 
  //   - No ?id param = fresh form, start at step 0
  //   - ?id=X param = load existing record from database
  //   - ?step=Y param = show specific step
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const initializeStepper = async () => {
      dispatch(setLoading(true))
      
      // Get params from URL
      const urlRecordId = searchParams.get('id')
      const urlStep = searchParams.get('step')
      
      // No record ID = fresh form
      if (!urlRecordId) {
        dispatch(setCurrentStep(initialStep >= 0 && initialStep < steps.length ? initialStep : 0))
        dispatch(setFormData({}))
        dispatch(setRecordId(null))
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
            // Set form data from response
            if (state.data && Object.keys(state.data).length > 0) {
              dispatch(setFormData(state.data))
              // Increment key to force FormIO remount with loaded data
              setDataLoadedKey(prev => prev + 1)
            }
            
            // Determine which step to show (URL step takes priority)
            let stepToUse = 0
            if (urlStep !== null) {
              stepToUse = parseInt(urlStep, 10)
            } else if (state.currentPage !== null && state.currentPage >= 0) {
              stepToUse = state.currentPage
            }
            
            if (stepToUse >= 0 && stepToUse < steps.length) {
              dispatch(setCurrentStep(stepToUse))
            }
          } else {
            // Record not found - treat as new form
            const stepToUse = urlStep ? parseInt(urlStep, 10) : 0
            dispatch(setCurrentStep(stepToUse >= 0 && stepToUse < steps.length ? stepToUse : 0))
          }
        } else {
          // API error - use defaults
          const stepToUse = urlStep ? parseInt(urlStep, 10) : 0
          dispatch(setCurrentStep(stepToUse >= 0 && stepToUse < steps.length ? stepToUse : 0))
        }
      } catch {
        // Network error - use defaults
        const stepToUse = urlStep ? parseInt(urlStep, 10) : 0
        dispatch(setCurrentStep(stepToUse >= 0 && stepToUse < steps.length ? stepToUse : 0))
      } finally {
        dispatch(setLoading(false))
      }
    }

    initializeStepper()
  }, [dispatch, searchParams, initialStep, steps.length])

  // Get the prefix for the current step's form fields
  const getFieldPrefix = useCallback((stepIndex: number, formId?: number): string => {
    // Use format: step{index}_form{id}_ for uniqueness
    // e.g., "step0_form8_" for step 0 with form ID 8
    if (formId) {
      return `step${stepIndex}_form${formId}_`
    }
    return `step${stepIndex}_`
  }, [])

  // Extract form data from the current step's form (with prefix)
  const getFormData = useCallback((): Record<string, any> => {
    if (!currentStepData.form) return {}

    const formContainer = formContainerRef.current
    if (!formContainer) return {}

    const formElement = formContainer.querySelector('.formio-container')
    if (!formElement) return {}

    const extractedData: Record<string, any> = {}
    const prefix = getFieldPrefix(currentStep, currentStepData.form.id)

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
      let name = element.name || element.id || element.getAttribute('data-key')
      
      if (!name || name.startsWith('_') || name.startsWith('$') || name === 'submit' || name === 'cancel') {
        return
      }

      name = cleanFieldName(name)
      
      // Add prefix to field name for storage
      const prefixedName = `${prefix}${name}`

      if (element.type === 'checkbox') {
        const checkbox = element as HTMLInputElement
        if (checkbox.checked) {
          extractedData[prefixedName] = checkbox.value || true
        }
      } else if (element.type === 'radio') {
        const radio = element as HTMLInputElement
        if (radio.checked) {
          extractedData[prefixedName] = radio.value
        }
      } else if (element.type !== 'file') {
        const value = element.value
        if (value && value !== '' && value !== 'Select') {
          extractedData[prefixedName] = value
        }
      }
    })

    return extractedData
  }, [currentStepData.form, currentStep, getFieldPrefix])

  // Get form data for the current step (remove prefix for FormIO)
  const getInitialDataForCurrentStep = useCallback((): Record<string, any> => {
    if (!currentStepData.form) return {}
    
    const prefix = getFieldPrefix(currentStep, currentStepData.form.id)
    const dataForStep: Record<string, any> = {}
    
    // Filter and transform data for current step
    Object.entries(formData).forEach(([key, value]) => {
      if (key.startsWith(prefix)) {
        // Remove prefix to get original field name for FormIO
        const originalFieldName = key.substring(prefix.length)
        dataForStep[originalFieldName] = value
      }
    })
    
    return dataForStep
  }, [formData, currentStep, currentStepData.form, getFieldPrefix])

  // Update URL with record ID and step
  const updateUrlWithId = useCallback((id: number, step: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('id', id.toString())
    url.searchParams.set('step', step.toString())
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Update URL step only
  const updateUrlStep = useCallback((step: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('step', step.toString())
    window.history.pushState({}, '', url.toString())
  }, [])

  // Save data to API
  const saveToAPI = useCallback(async (dataToSave: Record<string, any>): Promise<{ success: boolean; recordId?: number }> => {
    try {
      const response = await fetch('/api/forms/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: currentStepData.form?.id || 8,
          stepIndex: currentStep,
          data: dataToSave,
          recordId: recordId,
        }),
      })

      if (!response.ok) {
        return { success: false }
      }

      const result = await response.json()
      
      // Update Redux with record ID if returned (new record was created)
      if (result.recordId && !recordId) {
        dispatch(setRecordId(result.recordId))
      }
      
      dispatch(markSaved())
      return { success: true, recordId: result.recordId || recordId }
    } catch {
      return { success: false }
    }
  }, [currentStepData.form, currentStep, recordId, dispatch])

  // Capture current form data and store in Redux
  const captureFormData = useCallback(() => {
    const currentData = getFormData()
    if (currentData && Object.keys(currentData).length > 0) {
      dispatch(updateFormData(currentData))
    }
    return currentData
  }, [getFormData, dispatch])

  // Handle Next button click
  const handleNext = async () => {
    // Capture current form data
    const currentData = captureFormData()
    
    dispatch(setSaving(true))
    
    // Save to API
    const saveResult = await saveToAPI({ ...formData, ...currentData })
    
    dispatch(setSaving(false))

    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1
      dispatch(setCurrentStep(nextStep))
      
      // Update URL with record ID and next step
      if (saveResult.recordId) {
        updateUrlWithId(saveResult.recordId, nextStep)
      } else {
        updateUrlStep(nextStep)
      }
      
      onStepChange?.(nextStep)
    }
  }

  // Handle Previous button click
  const handlePrevious = () => {
    if (currentStep > 0) {
      // Capture current form data (this updates Redux internally)
      captureFormData()

      const prevStep = currentStep - 1
      dispatch(setCurrentStep(prevStep))
      updateUrlStep(prevStep)
      onStepChange?.(prevStep)
    }
  }

  // Handle step click in sidebar
  const handleStepClick = async (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < totalSteps && stepIndex !== currentStep) {
      // Capture current form data
      const currentData = captureFormData()
      
      dispatch(setSaving(true))
      
      // Save to API
      const saveResult = await saveToAPI({ ...formData, ...currentData })
      
      dispatch(setSaving(false))

      dispatch(setCurrentStep(stepIndex))
      
      // Update URL with record ID and new step
      if (saveResult.recordId) {
        updateUrlWithId(saveResult.recordId, stepIndex)
      } else {
        updateUrlStep(stepIndex)
      }
      
      onStepChange?.(stepIndex)
    }
  }

  // Handle Save & Exit button click
  const handleSaveAndExit = async () => {
    // Capture current form data
    const currentData = captureFormData()
    
    dispatch(setSaving(true))
    
    // Save to API
    await saveToAPI({ ...formData, ...currentData })
    
    dispatch(setSaving(false))
    
    // Redirect to home
    window.location.href = "/forms/pending"
    onSaveAndExit?.()
  }

  // Handle Submit button click
  const handleSubmit = async () => {
    // Capture current form data
    const currentData = captureFormData()
    
    dispatch(setSaving(true))
    
    // Save to API
    await saveToAPI({ ...formData, ...currentData })
    
    dispatch(setSaving(false))
    
    onSubmit?.()
  }

  return (
    <div className="flex bg-gray-50" style={{ minHeight: 'calc(100vh - 64px)' }}>
      {/* Left Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-gray-200 p-6">
        <nav className="space-y-2">
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep

            return (
              <button
                key={step.id}
                onClick={() => handleStepClick(index)}
                className={`w-full text-left px-4 py-3 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-50 border-l-4 border-blue-600 text-blue-900 font-semibold'
                    : isCompleted
                    ? 'text-gray-700 hover:bg-gray-50'
                    : 'text-gray-500 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div
                      className={`text-sm font-medium ${
                        isActive ? 'text-blue-900' : isCompleted ? 'text-gray-900' : 'text-gray-500'
                      }`}
                    >
                      {step.title}
                    </div>
                    {step.description && (
                      <div className="text-xs text-gray-500 mt-0.5 truncate">
                        {step.description}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            )
          })}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8">
        <div className="max-w-4xl mx-auto">
          {/* Step Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              {currentStepData.title}
            </h1>
            {currentStepData.description && (
              <p className="text-gray-600">{currentStepData.description}</p>
            )}
            <div className="mt-4 text-sm text-gray-500">
              Step {currentStep + 1} of {totalSteps}
              {recordId && (
                <span className="ml-4 text-xs bg-gray-100 px-2 py-1 rounded">
                  Record ID: {recordId}
                </span>
              )}
            </div>
          </div>

          {/* Form Content Area */}
          <div className="bg-white rounded-lg border border-gray-200 p-8 mb-6 min-h-[400px]">
            {currentStepData.form ? (
              <>
                <style
                  dangerouslySetInnerHTML={{
                    __html: `
                      .simple-stepper-form-${currentStepData.form?.id} button[type="submit"],
                      .simple-stepper-form-${currentStepData.form?.id} button[data-action="submit"],
                      .simple-stepper-form-${currentStepData.form?.id} button[data-action="cancel"],
                      .simple-stepper-form-${currentStepData.form?.id} button.cancel,
                      .simple-stepper-form-${currentStepData.form?.id} .formio-actions button[type="submit"],
                      .simple-stepper-form-${currentStepData.form?.id} .formio-actions button[data-action="cancel"] {
                        display: none !important;
                      }
                    `,
                  }}
                />
                <div
                  ref={formContainerRef}
                  className={`simple-stepper-form-${currentStepData.form.id}`}
                >
                  {isLoading ? (
                    <div className="text-center py-8">
                      <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <p className="mt-2 text-gray-600">Loading form data...</p>
                    </div>
                  ) : (
                    <FormIORender
                      key={`form-${currentStepData.form.id}-step-${currentStep}-loaded-${dataLoadedKey}`}
                      formSchema={currentStepData.form.schema}
                      formId={currentStepData.form.id}
                      submitButtonText={currentStepData.form.settings?.submitButtonText || 'Submit'}
                      initialData={getInitialDataForCurrentStep()}
                    />
                  )}
                </div>
              </>
            ) : (
              <div className="text-gray-500 italic">
                Form content for {currentStepData.title} will be rendered here
              </div>
            )}
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <div className="flex gap-4">
              <button
                onClick={handleSaveAndExit}
                disabled={isSaving}
                className={`px-6 py-2.5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium transition-colors duration-200 flex items-center gap-2 ${
                  isSaving ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-50'
                }`}
              >
                {isSaving ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save & Exit'
                )}
              </button>
            </div>

            <div className="flex gap-4">
              <button
                onClick={handlePrevious}
                disabled={isFirstStep || isSaving}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  isFirstStep || isSaving
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M15 19l-7-7 7-7"
                  />
                </svg>
                Previous
              </button>

              {isLastStep ? (
                <button
                  onClick={handleSubmit}
                  disabled={isSaving}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    !isSaving
                      ? 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      Submit
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  disabled={isSaving}
                  className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                    !isSaving
                      ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                  }`}
                >
                  {isSaving ? (
                    <>
                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Saving...
                    </>
                  ) : (
                    <>
                      Next
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9 5l7 7-7 7"
                        />
                      </svg>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
