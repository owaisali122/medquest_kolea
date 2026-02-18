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

interface TabStepperFormProps {
  steps: Step[]
  initialStep?: number
  onStepChange?: (stepIndex: number) => void
  onSaveAndExit?: () => void
  onSubmit?: () => void
}

export function TabStepperForm({
  steps,
  initialStep = 0,
  onStepChange,
  onSaveAndExit,
  onSubmit,
}: TabStepperFormProps) {
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
  const [dataLoadedKey, setDataLoadedKey] = useState(0)

  const totalSteps = steps.length
  const isFirstStep = currentStep === 0
  const isLastStep = currentStep === totalSteps - 1
  const currentStepData = steps[currentStep]

  // Initialize stepper from URL on mount
  useEffect(() => {
    if (isInitialized.current) return
    isInitialized.current = true

    const initializeStepper = async () => {
      dispatch(setLoading(true))
      
      // Check for record ID in query params first, then in path
      let urlRecordId = searchParams.get('id')
      const urlStep = searchParams.get('step')
      
      // Also check if ID is in the URL path (e.g., /forms/stepper/123)
      if (!urlRecordId) {
        const pathMatch = window.location.pathname.match(/\/forms\/stepper\/(\d+)/)
        if (pathMatch) {
          urlRecordId = pathMatch[1]
        }
      }
      
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
            if (state.data && Object.keys(state.data).length > 0) {
              dispatch(setFormData(state.data))
              setDataLoadedKey(prev => prev + 1)
            }
            
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
            const stepToUse = urlStep ? parseInt(urlStep, 10) : 0
            dispatch(setCurrentStep(stepToUse >= 0 && stepToUse < steps.length ? stepToUse : 0))
          }
        } else {
          const stepToUse = urlStep ? parseInt(urlStep, 10) : 0
          dispatch(setCurrentStep(stepToUse >= 0 && stepToUse < steps.length ? stepToUse : 0))
        }
      } catch {
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

    const cleanFieldName = (name: string): string => {
      if (!name) return name
      if (name.startsWith('data[') && name.endsWith(']')) {
        return name.substring(5, name.length - 1)
      } else if (name.startsWith('data.')) {
        return name.substring(5)
      }
      return name
    }

    const inputs = formElement.querySelectorAll('input, textarea, select')
    inputs.forEach((input) => {
      const element = input as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      let name = element.name || element.id || element.getAttribute('data-key')
      
      if (!name || name.startsWith('_') || name.startsWith('$') || name === 'submit' || name === 'cancel') {
        return
      }

      name = cleanFieldName(name)
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
      } else if (element.type === 'hidden' && element.classList.contains('searchable-dropdown-hidden-value')) {
        // Handle searchable dropdown JSON value
        const value = element.value
        if (value && value !== '') {
          try {
            extractedData[prefixedName] = JSON.parse(value)
          } catch {
            extractedData[prefixedName] = value
          }
        }
      } else if (element.type === 'hidden' && element.classList.contains('ssn-masking-hidden-value')) {
        // Handle SSN masking - use hidden input with raw value (digits only)
        const value = element.value
        if (value && value !== '') {
          extractedData[prefixedName] = value
        }
      } else if (element.type !== 'file') {
        // Skip visible inputs that are inside SSN masking wrapper (they show masked display)
        // The hidden input will be used instead
        if (element.closest('.ssn-masking-wrapper') && element.type !== 'hidden') {
          return // Skip this visible input, use hidden input instead
        }
        
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
    
    Object.entries(formData).forEach(([key, value]) => {
      if (key.startsWith(prefix)) {
        const originalFieldName = key.substring(prefix.length)
        dataForStep[originalFieldName] = value
      }
    })
    
    return dataForStep
  }, [formData, currentStep, currentStepData.form, getFieldPrefix])

  // Update URL with record ID and step
  // Supports both /forms/stepper?id=X&step=Y and /forms/stepper/X?step=Y patterns
  const updateUrlWithId = useCallback((id: number, step: number) => {
    const url = new URL(window.location.href)
    const pathname = url.pathname
    
    // Check if we're using the dynamic route pattern /forms/stepper/[id]
    if (pathname.match(/\/forms\/stepper\/\d+/) || pathname === '/forms/stepper/new') {
      // Redirect to the edit page with the new ID
      url.pathname = `/forms/stepper/${id}`
      url.searchParams.delete('id')
      url.searchParams.set('step', step.toString())
    } else {
      // Use query params for backwards compatibility
      url.searchParams.set('id', id.toString())
      url.searchParams.set('step', step.toString())
    }
    
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
    const currentData = captureFormData()
    
    dispatch(setSaving(true))
    
    const saveResult = await saveToAPI({ ...formData, ...currentData })
    
    dispatch(setSaving(false))

    if (currentStep < totalSteps - 1) {
      const nextStep = currentStep + 1
      dispatch(setCurrentStep(nextStep))
      
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
      captureFormData()

      const prevStep = currentStep - 1
      dispatch(setCurrentStep(prevStep))
      updateUrlStep(prevStep)
      onStepChange?.(prevStep)
    }
  }

  // Handle tab click
  const handleTabClick = async (stepIndex: number) => {
    if (stepIndex >= 0 && stepIndex < totalSteps && stepIndex !== currentStep) {
      const currentData = captureFormData()
      
      dispatch(setSaving(true))
      
      const saveResult = await saveToAPI({ ...formData, ...currentData })
      
      dispatch(setSaving(false))

      dispatch(setCurrentStep(stepIndex))
      
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
    const currentData = captureFormData()
    
    dispatch(setSaving(true))
    
    await saveToAPI({ ...formData, ...currentData })
    
    dispatch(setSaving(false))
    
    // Redirect to the main stepper list page
    window.location.href = "/forms/stepper"
    onSaveAndExit?.()
  }

  // Handle Submit button click
  const handleSubmit = async () => {
    const currentData = captureFormData()
    
    dispatch(setSaving(true))
    
    await saveToAPI({ ...formData, ...currentData })
    
    dispatch(setSaving(false))
    
    onSubmit?.()
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden" style={{ minHeight: 'calc(100vh - 200px)' }}>
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 bg-gray-50">
        <nav className="flex overflow-x-auto" aria-label="Tabs">
          {steps.map((step, index) => {
            const isActive = index === currentStep
            const isCompleted = index < currentStep

            return (
              <button
                key={step.id}
                onClick={() => handleTabClick(index)}
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
                  {/* Step indicator */}
                  <span
                    className={`flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : isCompleted
                        ? 'bg-green-500 text-white'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {isCompleted ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </span>
                  {/* Step title */}
                  <span className="truncate">{step.title}</span>
                </div>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Step Content */}
      <div className="p-8">
        {/* Step Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-1">
                {currentStepData.title}
              </h2>
              {currentStepData.description && (
                <p className="text-gray-600">{currentStepData.description}</p>
              )}
            </div>
            <div className="text-sm text-gray-500 flex items-center gap-3">
              <span>Step {currentStep + 1} of {totalSteps}</span>
              {recordId && (
                <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                  ID: {recordId}
                </span>
              )}
            </div>
          </div>
          {/* Progress bar */}
          <div className="mt-4 w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentStep + 1) / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Form Content Area */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 mb-6 min-h-[350px]">
          {currentStepData.form ? (
            <>
              <style
                dangerouslySetInnerHTML={{
                  __html: `
                    .tab-stepper-form-${currentStepData.form?.id} button[type="submit"],
                    .tab-stepper-form-${currentStepData.form?.id} button[data-action="submit"],
                    .tab-stepper-form-${currentStepData.form?.id} button[data-action="cancel"],
                    .tab-stepper-form-${currentStepData.form?.id} button.cancel,
                    .tab-stepper-form-${currentStepData.form?.id} .formio-actions button[type="submit"],
                    .tab-stepper-form-${currentStepData.form?.id} .formio-actions button[data-action="cancel"] {
                      display: none !important;
                    }
                  `,
                }}
              />
              <div
                ref={formContainerRef}
                className={`tab-stepper-form-${currentStepData.form.id}`}
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
            <div className="text-gray-500 italic text-center py-12">
              Form content for "{currentStepData.title}" will be rendered here
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
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
              disabled={isFirstStep || isSaving}
              className={`px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                isFirstStep || isSaving
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Previous
            </button>

            {isLastStep ? (
              <button
                onClick={handleSubmit}
                disabled={isSaving}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  !isSaving
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
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
                    Submit
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
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
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
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
                    Next
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
