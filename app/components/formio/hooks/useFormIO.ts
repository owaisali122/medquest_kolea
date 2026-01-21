'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface UseFormIOOptions {
  formSchema: any
  formId: number
  onSubmitUrl: string
  onSuccess?: (message: string) => void
  onError?: (error: string) => void
}

interface UseFormIOReturn {
  formRef: React.RefObject<HTMLDivElement>
  isLoading: boolean
  error: string | null
  isSubmitted: boolean
  submitMessage: string | null
}

/**
 * Custom hook to handle FormIO form initialization and submission
 */
export function useFormIO({
  formSchema,
  formId,
  onSubmitUrl,
  onSuccess,
  onError,
}: UseFormIOOptions): UseFormIOReturn {
  const formRef = useRef<HTMLDivElement>(null)
  const formInstanceRef = useRef<any>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [submitMessage, setSubmitMessage] = useState<string | null>(null)

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

        // Dynamically import FormIO - use Form class directly (more reliable)
        const formioModule: any = await import('formiojs')
        
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
            // Use Formio.createForm with custom submission handling
            const form = Formio.createForm(formRef.current!, formSchema, {
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
            })
            
            await form.ready

            if (!mounted) {
              form.destroy()
              return
            }

            formInstanceRef.current = form
            console.log('FormIO form initialized successfully (Formio.createForm)')

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
        const form = new FormClass(formRef.current!, formSchema, {
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
        })

        // Wait for form to be ready
        await form.ready

        if (!mounted) {
          form.destroy()
          return
        }

        formInstanceRef.current = form
        console.log('FormIO form initialized successfully')

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
      if (formInstanceRef.current) {
        try {
          formInstanceRef.current.destroy()
        } catch (e) {
          // Ignore destroy errors
        }
      }
    }
  }, [formSchema, handleSubmit, onError])

  return {
    formRef,
    isLoading,
    error,
    isSubmitted,
    submitMessage,
  }
}
