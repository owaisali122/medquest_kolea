'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { registerCustomComponents } from '../custom-components'

interface UseFormIOOptions {
  formSchema: any
  formId: number
  onSubmitUrl: string
  initialData?: Record<string, any> // Initial form data to populate
  onSuccess?: (message: string) => void
  onError?: (error: string) => void
}

interface UseFormIOReturn {
  formRef: React.RefObject<HTMLDivElement | null>
  isLoading: boolean
  error: string | null
  isSubmitted: boolean
  submitMessage: string | null
  formInstance: any
}

/**
 * Custom hook to handle FormIO form initialization and submission
 */
export function useFormIO({
  formSchema,
  formId,
  onSubmitUrl,
  initialData,
  onSuccess,
  onError,
}: UseFormIOOptions): UseFormIOReturn {
  const formRef = useRef<HTMLDivElement>(null)
  const formInstanceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

  console.log("Form initializing...")
  const handleSubmit = useCallback(
    async (submissionData: any) => {
      try {
        console.log('Form submission started:', { formId, data: submissionData })
        setIsLoading(true)
        setError(null)

        const response = await fetch(onSubmitUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            formId,
            data: submissionData,
          }),
        })

        console.log('Form submission response:', response.status, response.statusText)

        const result = await response.json()
        console.log('Form submission result:', result)

        if (!response.ok) {
          throw new Error(result.error || 'Failed to submit form')
        }

        const message = result.message || 'Thank you for your submission!'
        setIsSubmitted(true)
        setSubmitMessage(message)
        setIsLoading(false)
        onSuccess?.(message)
      } catch (err: any) {
        const errorMessage = err.message || 'Failed to submit form. Please try again.'
        console.error('Form submission error:', err)
        setError(errorMessage)
        setIsLoading(false)
        onError?.(errorMessage)
      }
    },
    [formId, onSubmitUrl, onSuccess, onError]
  )

  useEffect(() => {
    let mounted = true

    const initForm = async () => {
      if (!formRef.current || !formSchema) {
        setIsLoading(false)
        return
      }

      try {
        // Ensure we're in browser environment
        if (typeof window === 'undefined') {
          throw new Error('FormIO can only be loaded in browser environment')
        }

        const formioModule: any = await import('formiojs')
        await registerCustomComponents(
          (formioModule as any).Formio || (formioModule as any).default?.Formio || (formioModule as any).default
        )
        
        // Get Form class - try different import patterns
        let FormClass: any = null
        
        if (formioModule.Form) {
          FormClass = formioModule.Form
        } else if (formioModule.default && formioModule.default.Form) {
          FormClass = formioModule.default.Form
        } else if (formioModule.default && typeof formioModule.default === 'function') {
          // If default is Form class
          FormClass = formioModule.default
        }
        
        // If Form class not found, try Formio.createForm
        if (!FormClass) {
          const Formio = formioModule.default || formioModule.Formio || formioModule
          
          if (Formio && typeof Formio.createForm === 'function') {
            // Build form options
            const formOptions: any = {
              readOnly: false,
              noAlerts: false,
              hooks: {
                beforeSubmit: async (submission: any, next: any) => {
                  console.log('FormIO beforeSubmit hook (Formio.createForm):', submission)
                  // Prevent default submission
                  next(false)
                  
                  const cleanData = { ...submission.data }
                  delete cleanData.submit
                  delete cleanData.cancel
                  
                  await handleSubmit(cleanData)
                }
              }
            }

            // Use Formio.createForm with custom submission handling
            const form = await Formio.createForm(formRef.current!, formSchema, formOptions)
            
            // Wait for form to be fully ready if it has a ready promise
            if (form.ready) {
              await form.ready
            }

            if (!mounted) {
              form.destroy()
              return
            }

            formInstanceRef.current = form
            if (formRef.current) (formRef.current as any).formio = form
            console.log('FormIO form initialized successfully (Formio.createForm)', {
              hasData: !!form.data,
              hasSubmission: !!form.submission,
              hasSetSubmission: typeof form.setSubmission === 'function',
              hasRedraw: typeof form.redraw === 'function',
            })

            // Helper function to set data on DOM inputs directly
            const setDOMInputValues = (data: Record<string, any>) => {
              if (!formRef.current || !data) return
              
              Object.entries(data).forEach(([key, value]) => {
                if (value === undefined || value === null) return
                
                // Try multiple selector patterns for FormIO inputs
                const selectors = [
                  `[name="data[${key}]"]`,
                  `[name="${key}"]`,
                  `[data-key="${key}"]`,
                  `#${key}`,
                  `[id$="-${key}"]`, // FormIO generates IDs like "abc123-firstName"
                ]
                
                for (const selector of selectors) {
                  try {
                    const elements = formRef.current?.querySelectorAll(selector)
                    if (elements && elements.length > 0) {
                      elements.forEach((el: Element) => {
                        const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                        
                        if (input.type === 'checkbox') {
                          (input as HTMLInputElement).checked = Boolean(value)
                        } else if (input.type === 'radio') {
                          (input as HTMLInputElement).checked = input.value === String(value)
                        } else {
                          input.value = String(value)
                        }
                        
                        // Trigger input event for FormIO to pick up the change
                        input.dispatchEvent(new Event('input', { bubbles: true }))
                        input.dispatchEvent(new Event('change', { bubbles: true }))
                        
                        console.log(`✓ Set DOM value for ${key}:`, value)
                      })
                      break // Found and set, move to next key
                    }
                  } catch (e) {
                    // Ignore selector errors
                  }
                }
              })
            }

            // Helper function to set data on the form
            const setFormData = async (data: Record<string, any>) => {
              if (!form || !data) return
              
              console.log('Attempting to set form data:', Object.keys(data))
              
              // Primary method: Use setSubmission which is the official FormIO way
              try {
                if (typeof form.setSubmission === 'function') {
                  await form.setSubmission({ data: { ...data } }, { noValidate: true })
                  console.log('✓ Called form.setSubmission()')
                }
              } catch (e) {
                console.log('Could not call setSubmission:', e)
              }
              
              // Also try setting submission directly
              try {
                form.submission = { data: { ...data } }
                console.log('✓ Set form.submission directly')
              } catch (e) {
                console.log('Could not set form.submission:', e)
              }
              
              // Try redraw to force UI update
              try {
                if (typeof form.redraw === 'function') {
                  await form.redraw()
                  console.log('✓ Called form.redraw()')
                }
              } catch (e) {
                console.log('Could not call redraw:', e)
              }
              
              // Final fallback: Set DOM input values directly
              setDOMInputValues(data)
            }

            // Set initial data if provided
            if (initialData && Object.keys(initialData).length > 0) {
              console.log('Setting initial data for form (Formio.createForm)', formId, 'with', Object.keys(initialData).length, 'fields:', initialData)
              
              // Apply after form is fully rendered with increasing delays
              setTimeout(() => {
                if (!mounted) return
                setFormData(initialData)
              }, 100)
              
              setTimeout(() => {
                if (!mounted) return
                setFormData(initialData)
              }, 300)
              
              setTimeout(() => {
                if (!mounted) return
                setFormData(initialData)
              }, 600)
            }

            const submitHandler = async (submission: any) => {
              console.log('FormIO submit event fired (Formio.createForm):', submission)
              
              const cleanData = { ...submission.data }
              delete cleanData.submit
              delete cleanData.cancel

              console.log('Cleaned submission data:', cleanData)
              await handleSubmit(cleanData)
            }

            // Listen to multiple submit events
            form.on('submit', async (submission: any) => {
              console.log('FormIO submit event (before validation):', submission)
            })
            
            form.on('submitDone', submitHandler)
            form.on('submitButton', submitHandler)

            // Also handle error events
            form.on('error', (error: any) => {
              console.error('FormIO error event:', error)
              setError('Form error occurred. Please check your inputs.')
              setIsLoading(false)
            })

            setIsLoading(false)
            return
          }
          
          console.error('FormIO Module structure:', Object.keys(formioModule))
          throw new Error('Could not find Form or Formio.createForm in formiojs module')
        }

        // Use Form class directly

        // Destroy existing instance if any
        if (formInstanceRef.current) {
          try {
            formInstanceRef.current.destroy()
          } catch (e) {
            // Ignore destroy errors
          }
        }

        // Clear the container
        if (formRef.current) {
          formRef.current.innerHTML = ''
        }

        // Create form instance using Form class with custom submission
        // If initialData is provided, pass it during initialization
        const formOptions: any = {
          readOnly: false,
          noAlerts: false,
          hooks: {
            beforeSubmit: async (submission: any, next: any) => {
              console.log('FormIO beforeSubmit hook:', submission)
              // Prevent default submission and handle it ourselves
              next(false)
              
              const cleanData = { ...submission.data }
              delete cleanData.submit
              delete cleanData.cancel
              
              await handleSubmit(cleanData)
            }
          }
        }

        // If we have initial data, try to pass it during form creation
        if (initialData && Object.keys(initialData).length > 0) {
          formOptions.submission = { data: initialData }
        }

        const form = new FormClass(formRef.current!, formSchema, formOptions)

        // Wait for form to be ready
        await form.ready

        if (!mounted) {
          form.destroy()
          return
        }

        formInstanceRef.current = form
        if (formRef.current) (formRef.current as any).formio = form
        console.log('FormIO form initialized successfully')

        // Helper function to set data on DOM inputs directly
        const setDOMInputValues = (data: Record<string, any>) => {
          if (!formRef.current || !data) return
          
          Object.entries(data).forEach(([key, value]) => {
            if (value === undefined || value === null) return
            
            // Special handling for searchable dropdown - find the component and call setValue
            // This works with the react-select based component
            if (form) {
              // Try getComponent method
              if (form.getComponent) {
                try {
                  const component = form.getComponent(key)
                  if (component && component.component?.type === 'searchableDropdown') {
                    console.log(`Setting searchableDropdown ${key} value via getComponent:`, value)
                    component.setValue(value)
                    return
                  }
                } catch (e) {
                  console.log(`getComponent failed for ${key}:`, e)
                }
              }
              
              // Try iterating through all components
              if (form.everyComponent) {
                let found = false
                form.everyComponent((comp: any) => {
                  if (comp.component?.key === key && comp.component?.type === 'searchableDropdown') {
                    console.log(`Setting searchableDropdown ${key} value via everyComponent:`, value)
                    comp.setValue(value)
                    found = true
                  }
                })
                if (found) return
              }
              
              // Try components map directly
              if (form.components) {
                const findAndSet = (components: any[]): boolean => {
                  for (const comp of components) {
                    if (comp.component?.key === key && comp.component?.type === 'searchableDropdown') {
                      console.log(`Setting searchableDropdown ${key} value via components array:`, value)
                      comp.setValue(value)
                      return true
                    }
                    // Check nested components
                    if (comp.components && Array.isArray(comp.components)) {
                      if (findAndSet(comp.components)) return true
                    }
                  }
                  return false
                }
                if (findAndSet(form.components)) return
              }
            }
            
            // Also try to find ALL hidden inputs for searchable dropdown and set them
            const searchableDropdownHiddens = formRef.current?.querySelectorAll(
              `input.searchable-dropdown-hidden-value[name="${key}"]`
            )
            
            if (searchableDropdownHiddens && searchableDropdownHiddens.length > 0) {
              searchableDropdownHiddens.forEach((input) => {
                (input as HTMLInputElement).value = JSON.stringify(value)
              })
              console.log(`✓ Set ${searchableDropdownHiddens.length} searchable dropdown hidden input(s) for ${key}:`, value)
              // RETURN here to prevent the generic DOM setter from overwriting with non-JSON value
              return
            }
            
            // Try multiple selector patterns for FormIO inputs
            const selectors = [
              `[name="data[${key}]"]`,
              `[name="${key}"]`,
              `[data-key="${key}"]`,
              `#${key}`,
              `[id$="-${key}"]`, // FormIO generates IDs like "abc123-firstName"
            ]
            
            for (const selector of selectors) {
              try {
                const elements = formRef.current?.querySelectorAll(selector)
                if (elements && elements.length > 0) {
                  elements.forEach((el: Element) => {
                    const input = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
                    
                    if (input.type === 'checkbox') {
                      (input as HTMLInputElement).checked = Boolean(value)
                    } else if (input.type === 'radio') {
                      (input as HTMLInputElement).checked = input.value === String(value)
                    } else {
                      input.value = String(value)
                    }
                    
                    // Trigger input event for FormIO to pick up the change
                    input.dispatchEvent(new Event('input', { bubbles: true }))
                    input.dispatchEvent(new Event('change', { bubbles: true }))
                    
                    console.log(`✓ Set DOM value for ${key} (FormClass):`, value)
                  })
                  break // Found and set, move to next key
                }
              } catch (e) {
                // Ignore selector errors
              }
            }
          })
        }

        // Helper function to set data on the form
        const setFormData = async (data: Record<string, any>) => {
          if (!form || !data) return
          
          console.log('Attempting to set form data (FormClass):', Object.keys(data))
          
          // Primary method: Use setSubmission which is the official FormIO way
          try {
            if (typeof form.setSubmission === 'function') {
              await form.setSubmission({ data: { ...data } }, { noValidate: true })
              console.log('✓ Called form.setSubmission() (FormClass)')
            }
          } catch (e) {
            console.log('Could not call setSubmission:', e)
          }
          
          // Also try setting submission directly
          try {
            form.submission = { data: { ...data } }
            console.log('✓ Set form.submission directly (FormClass)')
          } catch (e) {
            console.log('Could not set form.submission:', e)
          }
          
          // Try redraw to force UI update
          try {
            if (typeof form.redraw === 'function') {
              await form.redraw()
              console.log('✓ Called form.redraw() (FormClass)')
            }
          } catch (e) {
            console.log('Could not call redraw:', e)
          }
          
          // Final fallback: Set DOM input values directly
          setDOMInputValues(data)
        }

        // Set initial data if provided
        if (initialData && Object.keys(initialData).length > 0) {
          console.log('Setting initial data for form', formId, 'with', Object.keys(initialData).length, 'fields:', initialData)
          
          // Apply after form is fully rendered with increasing delays
          setTimeout(() => {
            if (!mounted) return
            setFormData(initialData)
          }, 100)
          
          setTimeout(() => {
            if (!mounted) return
            setFormData(initialData)
          }, 300)
          
          setTimeout(() => {
            if (!mounted) return
            setFormData(initialData)
          }, 600)
        } else {
          console.log('No initial data provided for form', formId)
        }

        // Handle form submission - Use both 'submit' and 'submitDone' events
        const submitHandler = async (submission: any) => {
          console.log('FormIO submit event fired:', submission)
          
          // Clean submission data - remove form button states
          const cleanData = { ...submission.data }
          delete cleanData.submit
          delete cleanData.cancel

          console.log('Cleaned submission data:', cleanData)
          await handleSubmit(cleanData)
        }

        // Listen to submit event (before validation)
        form.on('submit', async (submission: any) => {
          console.log('FormIO submit event (before validation):', submission)
          // Don't process here, wait for submitDone
        })

        // Listen to submitDone event (after successful validation and submission)
        form.on('submitDone', submitHandler)

        // Also listen to submitButton event as fallback
        form.on('submitButton', submitHandler)

        // Handle error events from FormIO
        form.on('error', (error: any) => {
          console.error('FormIO error event:', error)
          setError('Form error occurred. Please check your inputs.')
          setIsLoading(false)
        })

        // Handle validation errors
        form.on('change', (changed: any) => {
          if (changed.invalid) {
            console.log('Form validation errors:', changed.errors)
          }
        })

        setIsLoading(false)
      } catch (err: any) {
        console.error('Error initializing FormIO:', err)
        const errorMessage = err.message || 'Failed to load form. Please refresh the page.'
        setError(errorMessage)
        setIsLoading(false)
        onError?.(errorMessage)
      }
    }

    initForm()

    return () => {
      mounted = false
      if (formRef.current) delete (formRef.current as any).formio
      if (formInstanceRef.current) {
        try {
          formInstanceRef.current.destroy()
        } catch (e) {
          // Ignore destroy errors
        }
      }
    }
  }, [formSchema, handleSubmit, onError, formId]) // Added formId to dependencies

  return {
    formRef,
    isLoading,
    error,
    isSubmitted,
    submitMessage,
    formInstance: formInstanceRef.current
  }
}
