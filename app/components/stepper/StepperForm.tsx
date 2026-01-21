'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import FormIORender from '../FormIORender'
import { FormIOCSSLoader } from '../formio/FormIOCSSLoader'
import { FormLoading } from '../formio/FormLoading'
import { FormError } from '../formio/FormError'
import { FormSuccess } from '../formio/FormSuccess'

interface StepForm {
  id: number
  title: string
  slug: string
  description?: string
  schema: any
}

interface StepperFormProps {
  forms: StepForm[]
  onSubmitUrl?: string
  onSuccess?: (data: any) => void
}

export function StepperForm({ forms, onSubmitUrl = '/api/forms/submit', onSuccess }: StepperFormProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [stepFormInstances, setStepFormInstances] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)
  const [isFormValid, setIsFormValid] = useState<boolean>(false)
  const formRefs = useRef<(HTMLDivElement | null)[]>([])

  const totalSteps = forms.length
  const isLastStep = currentStep === totalSteps - 1
 
  // Initialize form refs
  useEffect(() => {
    formRefs.current = formRefs.current.slice(0, totalSteps)
  }, [totalSteps])

  // Check if current form is valid - only validates the current step
  // Simplified: form is valid by default, only invalid if we find visible errors
  const checkFormValidity = useCallback(() => {
    // If form instance doesn't exist yet, assume valid (don't block user)
    if (!stepFormInstances[currentStep]) {
      console.log('No form instance for step:', currentStep, '- assuming valid')
      setIsFormValid(true) // Allow navigation if form not loaded yet
      return true
    }

    const formElement = formRefs.current[currentStep]

    // If form element doesn't exist yet, assume valid
    if (!formElement) {
      console.log('No form element for step:', currentStep, '- assuming valid')
      setIsFormValid(true) // Allow navigation if element not found
      return true
    }

    // Check for visible error messages - if none found, form is valid
    const checkForErrors = () => {
      let hasErrors = false

      // Look for all possible error message selectors
      const errorSelectors = [
        '.help-block',
        '.formio-errors',
        '.invalid-feedback',
        '[role="alert"]',
        '.alert-danger',
        '.formio-error-message'
      ]

      for (const selector of errorSelectors) {
        const errors = formElement.querySelectorAll(selector)
        for (const error of Array.from(errors)) {
          const style = window.getComputedStyle(error)
          const hasText = error.textContent && error.textContent.trim().length > 0
          
          // Only count as error if visible and has text
          if (hasText &&
              style.display !== 'none' && 
              style.visibility !== 'hidden' && 
              parseFloat(style.opacity || '1') > 0.5 &&
              parseFloat(style.height || '0') > 0) {
            hasErrors = true
            console.log('Found visible error:', error.textContent?.substring(0, 50))
            break
          }
        }
        if (hasErrors) break
      }

      // Also check for invalid fields with visible error messages
      if (!hasErrors) {
        const invalidFields = formElement.querySelectorAll('.is-invalid, .has-error')
        for (const field of Array.from(invalidFields)) {
          const container = field.closest('.formio-component, .form-group, .formio-field-wrapper')
          if (container) {
            const errorMsg = container.querySelector('.help-block, .invalid-feedback, .formio-errors, [role="alert"]')
            if (errorMsg) {
              const errorStyle = window.getComputedStyle(errorMsg)
              const hasErrorText = errorMsg.textContent && errorMsg.textContent.trim().length > 0
              if (hasErrorText &&
                  errorStyle.display !== 'none' && 
                  errorStyle.visibility !== 'hidden') {
                hasErrors = true
                console.log('Found invalid field with error:', errorMsg.textContent?.substring(0, 50))
                break
              }
            }
          }
        }
      }

      const isValid = !hasErrors

      console.log('Form validation check (step ' + currentStep + '):', {
        hasErrors,
        isValid,
        formElement: !!formElement,
        formInstance: !!stepFormInstances[currentStep]
      })

      setIsFormValid(isValid)
      return isValid
    }

    // Immediate check
    const immediateResult = checkForErrors()

    // Double-check after a short delay to catch any delayed validation
    setTimeout(() => {
      checkForErrors()
    }, 200)

    return immediateResult
  }, [currentStep, stepFormInstances])

  // Check form validity when step changes or form instance changes
  useEffect(() => {
    // Start with valid state (optimistic) - only invalidate if errors found
    setIsFormValid(true)
    
    // Check validation after form renders
    const timer = setTimeout(() => {
      checkFormValidity()
    }, 300) // Longer delay to ensure form is fully rendered
    
    return () => clearTimeout(timer)
  }, [currentStep, stepFormInstances, checkFormValidity])

  // Handle next step
  const handleNext = async () => {
    // Double-check validation before proceeding (with a fresh check)
    const isValid = checkFormValidity()
    
    if (!isValid) {
      console.log('Form validation failed, cannot proceed to next step')
      const formElement = formRefs.current[currentStep]
      if (formElement) {
        // Find first visible error and scroll to it
        const errorElements = formElement.querySelectorAll(
          '.help-block:not([style*="display: none"]), .invalid-feedback:not([style*="display: none"]), .formio-errors:not([style*="display: none"])'
        )
        if (errorElements.length > 0) {
          const firstError = Array.from(errorElements).find((el: any) => {
            const style = window.getComputedStyle(el)
            return style.display !== 'none' && style.visibility !== 'hidden'
          })
          if (firstError) {
            (firstError as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
        }
      }
      return
    }

    // Get current form data from FormIO instance
    if (stepFormInstances[currentStep]) {
      const currentFormInstance = stepFormInstances[currentStep]
      try {
        // Try to get form data - FormIO stores it in different places
        let currentData = {}
        
        // Try different ways to get the data
        if (currentFormInstance.submission) {
          currentData = currentFormInstance.submission.data || {}
        } else if (currentFormInstance.data) {
          currentData = currentFormInstance.data
        } else if (currentFormInstance._data) {
          currentData = currentFormInstance._data
        } else if (typeof currentFormInstance.getValue === 'function') {
          currentData = currentFormInstance.getValue() || {}
        }
        
        console.log('Current step data:', currentData)

        // Save current step data
        const updatedData = {
          ...formData,
          [`step_${currentStep}`]: currentData,
          ...currentData, // Merge with existing data
        }
        
        setFormData(updatedData)

        // Move to next step
        if (currentStep < totalSteps - 1) {
          setCurrentStep(currentStep + 1)
          // Reset validity for next step
          setIsFormValid(false)
        }
      } catch (error) {
        console.error('Error getting form data:', error)
      }
    }
  }

  // Handle previous step
  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  // Handle form initialization - memoized to prevent re-renders
  // Store initial data in a ref to avoid triggering re-renders
  const initialFormDataRef = useRef<Record<string, any>>({})
  
  // Update ref when formData changes (doesn't cause re-render)
  useEffect(() => {
    initialFormDataRef.current = formData
  }, [formData])

  const handleFormReady = useCallback((stepIndex: number, formInstance: any) => {
    // Only update instances array, don't trigger any other state updates
    setStepFormInstances((prevInstances) => {
      // Check if instance already exists to avoid unnecessary updates
      if (prevInstances[stepIndex] === formInstance) {
        return prevInstances
      }
      const newInstances = [...prevInstances]
      newInstances[stepIndex] = formInstance
      return newInstances
    })

    // Load previous data if available (only once when form initializes)
    // Use the ref instead of state to avoid re-renders
    const prevData = initialFormDataRef.current
    if (prevData && Object.keys(prevData).length > 0) {
      try {
        // Only set data that belongs to this step, exclude step_* keys
        const dataToSet: any = {}
        Object.keys(prevData).forEach((key) => {
          if (!key.startsWith('step_')) {
            dataToSet[key] = prevData[key]
          }
        })
        
        if (Object.keys(dataToSet).length > 0) {
          // Use setTimeout to ensure form is fully ready
          setTimeout(() => {
            try {
              formInstance.setSubmission({ data: dataToSet })
            } catch (error) {
              console.error('Error setting form data:', error)
            }
          }, 100)
        }
      } catch (error) {
        console.error('Error preparing form data:', error)
      }
    }
  }, []) // Empty deps - this function never changes

  // Memoize callbacks for StepperFormRenderer to prevent re-renders
  const handleFormRef = useCallback((el: HTMLDivElement | null) => {
    formRefs.current[currentStep] = el
  }, [currentStep])

  const handleFormReadyForStep = useCallback((instance: any) => {
    handleFormReady(currentStep, instance)
  }, [currentStep, handleFormReady])

  // Handle final submission
  const handleFinalSubmit = async () => {
    setIsSubmitting(true)
    setSubmitError(null)

    try {
      // Collect all step data
      const allFormData: any = { ...formData }

      // Get current step data
      if (stepFormInstances[currentStep]) {
        const currentFormInstance = stepFormInstances[currentStep]
        let currentData = {}
        
        // Try different ways to get the data
        if (currentFormInstance.submission) {
          currentData = currentFormInstance.submission.data || {}
        } else if (currentFormInstance.data) {
          currentData = currentFormInstance.data
        } else if (currentFormInstance._data) {
          currentData = currentFormInstance._data
        } else if (typeof currentFormInstance.getValue === 'function') {
          currentData = currentFormInstance.getValue() || {}
        }
        
        Object.assign(allFormData, currentData)
      }

      // Clean data - remove step keys and button states
      const cleanData: any = {}
      Object.keys(allFormData).forEach((key) => {
        if (!key.startsWith('step_') && key !== 'submit' && key !== 'cancel') {
          cleanData[key] = allFormData[key]
        }
      })

      console.log('Submitting stepper form data:', cleanData)

      // Use the last form's ID for submission
      const lastFormId = forms[forms.length - 1].id

      const response = await fetch(onSubmitUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId: lastFormId,
          data: cleanData,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit form')
      }

      setIsSubmitted(true)
      setSubmitMessage(result.message || 'Thank you for your submission!')
      onSuccess?.(cleanData)
    } catch (err: any) {
      console.error('Stepper form submission error:', err)
      setSubmitError(err.message || 'Failed to submit form. Please try again.')
      setIsSubmitting(false)
    }
  }

  if (submitError) {
    return <FormError message={submitError} />
  }

  if (isSubmitted) {
    return <FormSuccess message={submitMessage || 'Thank you for your submission!'} />
  }

  if (forms.length === 0) {
    return <FormError message="No forms available for stepper" />
  }

  const currentForm = forms[currentStep]

  return (
    <>
      <FormIOCSSLoader />
      
      <div className="stepper-container">
        {/* Stepper Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {forms.map((form, index) => (
              <div key={form.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center flex-1">
                  {/* Step Circle */}
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold transition-all duration-200 ${
                      index < currentStep
                        ? 'bg-green-500 text-white'
                        : index === currentStep
                        ? 'bg-blue-600 text-white ring-4 ring-blue-200'
                        : 'bg-gray-300 text-gray-600'
                    }`}
                  >
                    {index < currentStep ? (
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </div>
                  {/* Step Title */}
                  <div className="mt-2 text-xs font-medium text-center max-w-[100px]">
                    <span className={index <= currentStep ? 'text-gray-900' : 'text-gray-500'}>
                      {form.title}
                    </span>
                  </div>
                </div>
                {/* Connector Line */}
                {index < forms.length - 1 && (
                  <div
                    className={`h-1 flex-1 mx-2 -mt-6 ${
                      index < currentStep ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Current Step Form */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">
              {currentForm.title}
            </h2>
            {currentForm.description && (
              <p className="text-gray-600">{currentForm.description}</p>
            )}
            <p className="text-sm text-gray-500 mt-2">
              Step {currentStep + 1} of {totalSteps}
            </p>
          </div>

          <div className="mb-6">
            <StepperFormRenderer
              key={`step-${currentStep}-${currentForm.id}`}
              form={currentForm}
              formRef={handleFormRef}
              onFormReady={handleFormReadyForStep}
              onValidationChange={checkFormValidity}
              initialFormData={formData}
            />
          </div>

          {/* Navigation Buttons */}
          <div className="flex justify-between items-center pt-6 border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <span className="flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                Previous
              </span>
            </button>

            {isLastStep ? (
              <button
                onClick={handleFinalSubmit}
                disabled={isSubmitting || !isFormValid}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  isSubmitting || !isFormValid
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                    : 'bg-green-600 text-white hover:bg-green-700 cursor-pointer'
                }`}
                title={!isFormValid ? 'Please fill all required fields correctly to submit' : ''}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Submitting...
                  </>
                ) : (
                  <>
                    Submit All Forms
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!isFormValid}
                className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 flex items-center gap-2 ${
                  isFormValid
                    ? 'bg-blue-600 text-white hover:bg-blue-700 cursor-pointer'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed opacity-50'
                }`}
                title={!isFormValid ? 'Please fill all required fields correctly to continue' : ''}
              >
                Next
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

// Separate component for rendering individual step forms
interface StepperFormRendererProps {
  form: StepForm
  formRef: (el: HTMLDivElement | null) => void
  onFormReady: (instance: any) => void
  onValidationChange?: () => void
  initialFormData: Record<string, any>
}

function StepperFormRenderer({ form, formRef, onFormReady, onValidationChange, initialFormData }: StepperFormRendererProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const formInstanceRef = useRef<any>(null)
  const hasInitializedRef = useRef(false)
  const initialDataRef = useRef<Record<string, any>>(initialFormData)
  const validationCheckTimerRef = useRef<NodeJS.Timeout | null>(null)

  // Update initial data ref only once when component mounts
  useEffect(() => {
    if (!hasInitializedRef.current) {
      initialDataRef.current = initialFormData
    }
  }, []) // Empty deps - only run once on mount

  useEffect(() => {
    let mounted = true

    // Skip if already initialized
    if (hasInitializedRef.current && formInstanceRef.current) {
      return
    }

    const initForm = async () => {
      if (typeof window === 'undefined') return

      try {
        // Destroy existing form instance if any
        if (formInstanceRef.current) {
          try {
            formInstanceRef.current.destroy()
          } catch (e) {
            console.log('Error destroying previous form:', e)
          }
          formInstanceRef.current = null
        }

        const formioModule: any = await import('formiojs')
        
        let FormClass: any = null
        let Formio: any = null

        if (formioModule.Form) {
          FormClass = formioModule.Form
        } else if (formioModule.default?.Form) {
          FormClass = formioModule.default.Form
        } else {
          Formio = formioModule.default || formioModule.Formio || formioModule
        }

        const formContainer = document.getElementById(`step-form-${form.id}`)
        if (!formContainer) {
          setIsLoading(false)
          return
        }

        // Clear container
        formContainer.innerHTML = ''

        let formInstance: any

        // Modify schema to hide submit and cancel buttons for stepper
        const modifiedSchema = {
          ...form.schema,
          display: form.schema.display || 'form',
          components: form.schema.components || [],
        }

        // Find and hide submit/cancel buttons in the schema
        const hideButtons = (components: any[]): any[] => {
          return components.map((component: any) => {
            if (component.type === 'button') {
              if (component.action === 'submit' || component.action === 'cancel') {
                return {
                  ...component,
                  hidden: true, // Hide the button
                }
              }
            }
            // Recursively process nested components (like panels, tabs, etc.)
            if (component.components && Array.isArray(component.components)) {
              return {
                ...component,
                components: hideButtons(component.components),
              }
            }
            return component
          })
        }

        modifiedSchema.components = hideButtons(modifiedSchema.components)

        if (FormClass) {
          formInstance = new FormClass(formContainer, modifiedSchema, {
            readOnly: false,
            noAlerts: true,
            hideSubmitButton: true, // Completely hide submit button
            hideCancelButton: true, // Completely hide cancel button
            buttons: false, // Disable all default buttons
            hooks: {
              beforeSubmit: async (submission: any, next: any) => {
                // Prevent default submission for stepper - handled by stepper navigation
                next(false)
              },
              beforeCancel: async (next: any) => {
                // Prevent cancel action in stepper
                next(false)
              }
            }
          })
        } else if (Formio?.createForm) {
          formInstance = Formio.createForm(formContainer, modifiedSchema, {
            readOnly: false,
            noAlerts: true,
            hideSubmitButton: true, // Completely hide submit button
            hideCancelButton: true, // Completely hide cancel button
            buttons: false, // Disable all default buttons
            hooks: {
              beforeSubmit: async (submission: any, next: any) => {
                // Prevent default submission for stepper - handled by stepper navigation
                next(false)
              },
              beforeCancel: async (next: any) => {
                // Prevent cancel action in stepper
                next(false)
              }
            }
          })
        } else {
          throw new Error('Could not initialize FormIO')
        }

        await formInstance.ready

        if (!mounted) {
          try {
            formInstance.destroy()
          } catch (e) {
            // Ignore
          }
          return
        }

        // Set existing data only once during initialization (exclude step_* keys)
        // Use the initial data ref, not the prop (which changes on every keystroke)
        const currentInitialData = initialDataRef.current
        if (currentInitialData && Object.keys(currentInitialData).length > 0) {
          try {
            const dataToSet: any = {}
            Object.keys(currentInitialData).forEach((key) => {
              if (!key.startsWith('step_') && key !== 'submit' && key !== 'cancel') {
                dataToSet[key] = currentInitialData[key]
              }
            })
            
            if (Object.keys(dataToSet).length > 0) {
              // Small delay to ensure form is fully rendered
              setTimeout(() => {
                if (mounted && formInstance) {
                  try {
                    formInstance.setSubmission({ data: dataToSet })
                  } catch (e) {
                    console.log('Could not set initial form data:', e)
                  }
                }
              }, 50)
            }
          } catch (e) {
            console.log('Could not prepare form data:', e)
          }
        }

        formInstanceRef.current = formInstance
        hasInitializedRef.current = true
        onFormReady(formInstance)
        setIsLoading(false)

        // Set up validation change listeners - check validation on any form change
        if (onValidationChange) {
          // Listen to form changes to trigger validation check
          const triggerValidationCheck = () => {
            if (validationCheckTimerRef.current) {
              clearTimeout(validationCheckTimerRef.current)
            }
            // Reduce debounce time for more responsive validation
            validationCheckTimerRef.current = setTimeout(() => {
              onValidationChange()
            }, 150) // Shorter debounce for better responsiveness
          }

          // Listen to various FormIO events that indicate form changes
          formInstance.on('change', triggerValidationCheck)
          formInstance.on('error', triggerValidationCheck)
          formInstance.on('render', triggerValidationCheck)
          formInstance.on('componentChange', triggerValidationCheck)
          formInstance.on('submitButton', triggerValidationCheck)

          // Also check on blur events (when user leaves a field) and input events
          const formContainer = document.getElementById(`step-form-${form.id}`)
          if (formContainer) {
            // Use capture phase to catch all events
            const handleFieldChange = () => {
              triggerValidationCheck()
            }
            
            formContainer.addEventListener('blur', handleFieldChange, true)
            formContainer.addEventListener('input', handleFieldChange, true)
            formContainer.addEventListener('change', handleFieldChange, true)
            
            // Store event handlers for cleanup
            ;(formContainer as any).__validationHandlers = {
              blur: handleFieldChange,
              input: handleFieldChange,
              change: handleFieldChange
            }
          }

          // Also trigger validation check immediately after form is ready
          setTimeout(() => {
            triggerValidationCheck()
          }, 300)

          // Force validation check when form is fully loaded
          formInstance.on('render', () => {
            setTimeout(() => {
              triggerValidationCheck()
            }, 100)
          })

          // Check validation on any component change
          formInstance.on('componentChange', (component: any) => {
            // Wait a bit for validation to run
            setTimeout(() => {
              triggerValidationCheck()
            }, 100)
          })

          // Check validation when submission changes (user fills fields)
          formInstance.on('change', () => {
            setTimeout(() => {
              triggerValidationCheck()
            }, 150)
          })
        }
      } catch (err: any) {
        console.error('Error initializing form:', err)
        setError(err.message || 'Failed to load form')
        setIsLoading(false)
      }
    }

    initForm()

    return () => {
      mounted = false
      
      // Clear validation timer
      if (validationCheckTimerRef.current) {
        clearTimeout(validationCheckTimerRef.current)
      }

      // Remove event listeners
      const formContainer = document.getElementById(`step-form-${form.id}`)
      if (formContainer && (formContainer as any).__validationHandlers) {
        const handlers = (formContainer as any).__validationHandlers
        formContainer.removeEventListener('blur', handlers.blur, true)
        formContainer.removeEventListener('input', handlers.input, true)
        formContainer.removeEventListener('change', handlers.change, true)
        delete (formContainer as any).__validationHandlers
      }

      if (formInstanceRef.current) {
        try {
          // Remove FormIO event listeners
          const instance = formInstanceRef.current
          if (instance.off) {
            instance.off('change')
            instance.off('error')
            instance.off('render')
            instance.off('componentChange')
            instance.off('submitButton')
          }
          if (instance.destroy) {
            instance.destroy()
          }
        } catch (e) {
          // Ignore cleanup errors
        }
        formInstanceRef.current = null
      }
      hasInitializedRef.current = false
    }
  }, [form.schema, form.id, onFormReady]) // Only re-run when form schema or id changes

  if (error) {
    return <FormError message={error} />
  }

  return (
    <>
      {/* CSS to hide submit/cancel buttons in stepper forms - comprehensive coverage */}
      <style dangerouslySetInnerHTML={{
        __html: `
          /* Hide all submit buttons */
          #step-form-${form.id} button[type="submit"],
          #step-form-${form.id} button[data-action="submit"],
          #step-form-${form.id} .btn.btn-primary[type="submit"],
          #step-form-${form.id} .btn.btn-success[type="submit"],
          #step-form-${form.id} button.btn-primary[type="submit"],
          #step-form-${form.id} button.btn-success[type="submit"],
          #step-form-${form.id} .formio-actions button[type="submit"],
          #step-form-${form.id} .formio-actions button[data-action="submit"],
          #step-form-${form.id} .formio-button-wrapper button[type="submit"],
          #step-form-${form.id} .formio-button-wrapper button[data-action="submit"],
          
          /* Hide all cancel buttons */
          #step-form-${form.id} button[type="button"][data-action="cancel"],
          #step-form-${form.id} button[data-action="cancel"],
          #step-form-${form.id} button.cancel,
          #step-form-${form.id} .btn.btn-secondary[data-action="cancel"],
          #step-form-${form.id} .btn.btn-danger[data-action="cancel"],
          #step-form-${form.id} .btn.btn-cancel,
          #step-form-${form.id} button.btn-secondary[data-action="cancel"],
          #step-form-${form.id} button.btn-danger[data-action="cancel"],
          #step-form-${form.id} .formio-actions button[data-action="cancel"],
          #step-form-${form.id} .formio-button-wrapper button[data-action="cancel"],
          #step-form-${form.id} .formio-actions .btn-secondary,
          #step-form-${form.id} .formio-button-wrapper .btn-secondary,
          
          /* Hide FormIO action buttons container if it only has submit/cancel */
          #step-form-${form.id} .formio-actions:has(button[data-action="submit"]):has(button[data-action="cancel"]):not(:has(button:not([data-action="submit"]):not([data-action="cancel"]))),
          #step-form-${form.id} .formio-button-wrapper:has(button[data-action="submit"]):has(button[data-action="cancel"]):not(:has(button:not([data-action="submit"]):not([data-action="cancel"]))) {
            display: none !important;
          }
          
          /* Hide any button with cancel text */
          #step-form-${form.id} button:contains("Cancel"),
          #step-form-${form.id} button:contains("cancel") {
            display: none !important;
          }
        `
      }} />
      <div ref={formRef} className="stepper-form-wrapper" id={`stepper-form-wrapper-${form.id}`}>
        {isLoading && <FormLoading />}
        <div
          id={`step-form-${form.id}`}
          name={`step-form-${form.id}`}
          className={isLoading ? 'hidden' : ''}
          style={{ minHeight: '200px' }}
          role="form"
          aria-label={`Step form: ${form.title}`}
        />
      </div>
    </>
  )
}
