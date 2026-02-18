'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import FormIORender from '@/app/components/FormIORender'
import { FormIOCSSLoader } from '@/app/components/formio/FormIOCSSLoader'

interface ButtonConfig {
  id?: string
  key?: string
  label?: string
  action?: string
  type?: string
  customClass?: string
  disabled?: boolean
  [key: string]: any
}

interface TabButtons {
  tabKey: string
  tabLabel: string
  buttons: ButtonConfig[]
}

interface TabsButtonsWrapperProps {
  formSchema: any
  formId: number
  submitButtonText?: string
  initialData?: Record<string, any>
  initialTab?: number
}

/**
 * Extracts buttons from tabnavigationbuttons components in each tab
 * Based on the actual JSON structure where buttons are individual components
 */
function extractTabButtons(schema: any): TabButtons[] {
  const tabButtons: TabButtons[] = []
  
  if (!schema || !schema.components) {
    return tabButtons
  }

  // Find tabs component
  const tabsComponent = schema.components.find((comp: any) => 
    comp.type === 'tabs' || comp.type === 'panel'
  )

  if (!tabsComponent || !tabsComponent.components) {
    return tabButtons
  }

  // Extract buttons from each tab
  tabsComponent.components.forEach((tab: any) => {
    const tabKey = tab.key || tab.id || ''
    const tabLabel = tab.label || tab.title || ''
    const buttons: ButtonConfig[] = []

    // Find all tabnavigationbuttons components in this tab
    if (tab.components && Array.isArray(tab.components)) {
      tab.components.forEach((comp: any) => {
        if (comp.type === 'tabnavigationbuttons') {
          buttons.push({
            id: comp.id,
            key: comp.key,
            label: comp.label || 'Button',
            action: comp.action || 'button',
            type: comp.type,
            customClass: comp.customClass,
            disabled: comp.disabled || false,
            ...comp
          })
        }
      })
    }

    if (buttons.length > 0) {
      tabButtons.push({
        tabKey,
        tabLabel,
        buttons
      })
    }
  })

  return tabButtons
}

function toFieldKey(name: string): string {
  if (!name) return name
  let key = name
  if (name.startsWith('data[') && name.endsWith(']')) key = name.slice(5, -1)
  else if (name.startsWith('data.')) key = name.slice(5)
  if (key.includes('][')) key = key.split('][')[0]
  return key
}

function parseTabIndex(
  urlTab: string | null,
  initialTab?: number,
  fallback?: number
): number {
  if (urlTab !== null && urlTab !== '') return parseInt(urlTab, 10)
  if (initialTab !== undefined && initialTab !== null && initialTab >= 0) return initialTab
  return fallback ?? 0
}

export function TabsButtonsWrapper({
  formSchema,
  formId,
  submitButtonText = 'Submit',
  initialData,
  initialTab,
}: TabsButtonsWrapperProps) {
  const searchParams = useSearchParams()
  const [tabButtons, setTabButtons] = useState<TabButtons[]>([])
  const [currentTabIndex, setCurrentTabIndex] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [recordId, setRecordId] = useState<number | null>(null)
  const [formData, setFormData] = useState<Record<string, any>>(initialData || {})
  const [dataLoadedKey, setDataLoadedKey] = useState(0) // Key to force FormIO remount when data loads
  const [isLoadingData, setIsLoadingData] = useState(false) // Track if we're loading data from DB
  const formDataRef = useRef<Record<string, any>>(initialData || {})
  const isInitialized = useRef(false)
  const isInitializing = useRef(true) // Track if we're still initializing
  const initialTabSet = useRef(false) // Track if initial tab has been set
  const initializationRecordId = useRef<string | null>(null) // Track which record we initialized for

  // Initialize from URL and load saved data
  useEffect(() => {
    // Check for record ID in query params first, then in path
    let urlRecordId = searchParams.get('id')
    const urlTab = searchParams.get('tab')
    
    // Also check if ID is in the URL path (e.g., /forms/tabs/123 or /forms/tab-application/123)
    if (!urlRecordId) {
      const pathMatch = window.location.pathname.match(/\/forms\/(?:tabs|tab-application)\/(\d+)/)
      if (pathMatch) {
        urlRecordId = pathMatch[1]
      }
    }

    // Only initialize once per record ID
    const recordIdKey = urlRecordId || 'new'
    if (isInitialized.current && initializationRecordId.current === recordIdKey) {
      return
    }
    
    isInitialized.current = true
    initializationRecordId.current = recordIdKey
    isInitializing.current = true
    initialTabSet.current = false

    const initializeTabs = async () => {
      
      // No record ID = fresh form
      if (!urlRecordId) {
        setCurrentTabIndex(parseTabIndex(urlTab, initialTab))
        initialTabSet.current = true
        setFormData(initialData || {})
        setRecordId(null)
        formDataRef.current = initialData || {}
        setIsLoadingData(false)
        isInitializing.current = false
        return
      }
      
      // Have record ID - load from database
      setIsLoadingData(true)
      const recordIdNum = parseInt(urlRecordId, 10)
      setRecordId(recordIdNum)
      
      try {
        const response = await fetch(`/api/forms/get-session-state?recordId=${recordIdNum}`)
        
        if (response.ok) {
          const state = await response.json()
          
          if (state.hasSavedState) {
            if (state.data && Object.keys(state.data).length > 0) {
              // Filter out metadata from form data
              const { _metadata, ...formDataOnly } = state.data
              
              // Set form data and force FormIO remount with loaded data
              setFormData(formDataOnly)
              formDataRef.current = formDataOnly
              setDataLoadedKey(prev => prev + 1) // Force FormIO remount
            }
            
            const tabToUse = parseTabIndex(urlTab, initialTab, state.currentPage ?? 0)
            
            setCurrentTabIndex(tabToUse)
            initialTabSet.current = true
            
            // Switch to the correct tab after FormIO has remounted with data
            setTimeout(() => {
              const formElement = document.querySelector(`.formio-container-${formId}`)
              if (formElement) {
                const tabLinks = formElement.querySelectorAll('.nav-tabs .nav-link')
                if (tabLinks[tabToUse]) {
                  (tabLinks[tabToUse] as HTMLElement).click()
                  // Mark initialization as complete after tab switch
                  setTimeout(() => {
                    isInitializing.current = false
                  }, 500)
                } else {
                  isInitializing.current = false
                }
              } else {
                isInitializing.current = false
              }
            }, 1200) // Delay to ensure FormIO is fully initialized with data
          } else {
            // Record not found - treat as new form
            let tabIndex = 0
            if (urlTab !== null && urlTab !== '') {
              tabIndex = parseInt(urlTab, 10)
            } else if (initialTab !== undefined && initialTab !== null && initialTab >= 0) {
              tabIndex = initialTab
            }
            setCurrentTabIndex(tabIndex)
            initialTabSet.current = true
            setFormData(initialData || {})
            formDataRef.current = initialData || {}
            isInitializing.current = false
          }
        }
      } catch (error) {
        console.error('Error loading saved state:', error)
        setCurrentTabIndex(parseTabIndex(urlTab, initialTab))
        initialTabSet.current = true
        isInitializing.current = false
      } finally {
        setIsLoadingData(false)
      }
    }

    initializeTabs()
  }, [searchParams, initialData, formId, initialTab])

  // Extract buttons from schema
  useEffect(() => {
    const extracted = extractTabButtons(formSchema)
    setTabButtons(extracted)
  }, [formSchema])

  // Hide tabnavigationbuttons components and FormIO default buttons
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .formio-container-${formId} .formio-component-tabnavigationbuttons,
      .formio-container-${formId} [data-type="tabnavigationbuttons"],
      .formio-container-${formId} button[type="submit"],
      .formio-container-${formId} button[data-action="submit"],
      .formio-container-${formId} .formio-actions button[type="submit"] {
        display: none !important;
      }
    `
    document.head.appendChild(style)
    return () => {
      if (document.head.contains(style)) {
        document.head.removeChild(style)
      }
    }
  }, [formId])

  // Update URL with record ID and tab
  const updateUrlWithId = useCallback((id: number, tab: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('id', id.toString())
    url.searchParams.set('tab', tab.toString())
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Update URL tab only
  const updateUrlTab = useCallback((tab: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('tab', tab.toString())
    window.history.replaceState({}, '', url.toString())
  }, [])

  // Keep formDataRef in sync
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  const getFormInstance = useCallback((): any => {
    const mount = document.querySelector(`.formio-container-${formId} [data-formio-mount]`)
    return (mount as any)?.formio ?? null
  }, [formId])

  const restoreFormData = useCallback(async (dataToRestore: Record<string, any>) => {
    const formInstance = getFormInstance()
    const formElement = document.querySelector(`.formio-container-${formId}`)
    if ((!formInstance && !formElement) || !dataToRestore || Object.keys(dataToRestore).length === 0) return false
    try {
      if (formInstance?.ready) await formInstance.ready
      if (formInstance && typeof formInstance.setSubmission === 'function') {
        await formInstance.setSubmission({ data: { ...dataToRestore } }, { noValidate: true })
      }
      if (formInstance && typeof formInstance.everyComponent === 'function') {
        formInstance.everyComponent((comp: any) => {
          const key = comp.component?.key
          const val = key ? dataToRestore[key] : undefined
          if (key && val !== undefined && val !== null && typeof comp.setValue === 'function') {
            try { comp.setValue(val) } catch (_) {}
          }
        })
      }
      if (formInstance && typeof formInstance.redraw === 'function') await formInstance.redraw()
      await new Promise((r) => setTimeout(r, 0))

      const restoreSearchableDropdowns = () => {
        if (formInstance?.everyComponent) {
          formInstance.everyComponent((comp: any) => {
            const key = comp.component?.key
            const val = key ? dataToRestore[key] : undefined
            if (key && comp.component?.type === 'searchableDropdown' && val != null && typeof comp.setValue === 'function') {
              try { comp.setValue(val) } catch (_) {}
            }
          })
        }
        if (formElement) {
          Object.entries(dataToRestore).forEach(([key, val]) => {
            if (val == null) return
            const jsonVal = typeof val === 'object' ? JSON.stringify(val) : String(val)
            formElement.querySelectorAll(`input.searchable-dropdown-hidden-value[name="${key}"], input.searchable-dropdown-hidden-value[data-key="${key}"]`).forEach((el) => {
              (el as HTMLInputElement).value = jsonVal
            })
          })
        }
      }
      restoreSearchableDropdowns()
      setTimeout(restoreSearchableDropdowns, 150)

      if (formElement) {
        const scope = formElement.querySelector('.tab-pane.active') || formElement
        const radios = scope.querySelectorAll('input[type="radio"]')
        const byKey = new Map<string, HTMLInputElement[]>()
        radios.forEach((el) => {
          const input = el as HTMLInputElement
          const key = toFieldKey(input.name || '')
          if (key) {
            if (!byKey.has(key)) byKey.set(key, [])
            byKey.get(key)!.push(input)
          }
        })
        byKey.forEach((inputs, key) => {
          const val = dataToRestore[key]
          if (val === undefined || val === null) return
          inputs.forEach((input) => {
            input.checked = String(input.value) === String(val)
          })
        })
        scope.querySelectorAll('input[type="checkbox"]').forEach((el) => {
          const input = el as HTMLInputElement
          const key = toFieldKey(input.name || '')
          const val = key ? dataToRestore[key] : undefined
          if (key && val !== undefined && val !== null) {
            input.checked = typeof val === 'boolean' ? val : (val === input.value || val === true)
          }
        })
      }
      return true
    } catch (e) {
      console.warn('restoreFormData error:', e)
      return false
    }
  }, [formId, getFormInstance])

  useEffect(() => {
    if (!formData || Object.keys(formData).length === 0) return
    restoreFormData(formData)
  }, [recordId, formData, formId, dataLoadedKey, restoreFormData])

  const captureFormData = useCallback((): Record<string, any> => {
    const formElement = document.querySelector(`.formio-container-${formId}`)
    if (!formElement) return {}
    const formInstance = getFormInstance()
    const out: Record<string, any> = formInstance?.data ? { ...formInstance.data } : {}

    const scope = formElement.querySelector('.tab-pane.active') || formElement
    const getVal = (e: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
      if (e.type === 'checkbox') return (e as HTMLInputElement).checked ? ((e as HTMLInputElement).value || true) : false
      if (e.type === 'radio') return (e as HTMLInputElement).checked ? (e as HTMLInputElement).value : undefined
      if (e.type === 'hidden' && e.classList.contains('searchable-dropdown-hidden-value') && e.value) {
        try { return JSON.parse(e.value) } catch { return e.value }
      }
      if (e.type === 'hidden' && e.classList.contains('ssn-masking-hidden-value')) return e.value || undefined
      if ((e as HTMLSelectElement).tagName === 'SELECT') {
        const s = e as HTMLSelectElement
        return s.multiple ? Array.from(s.selectedOptions).map((o) => o.value) : s.value && s.value !== 'Select' ? s.value : undefined
      }
      if (e.type !== 'file' && e.type !== 'hidden' && !e.closest('.ssn-masking-wrapper') && e.value && e.value !== 'Select') return e.value
      return undefined
    }
    scope.querySelectorAll('input, textarea, select').forEach((el) => {
      const e = el as HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
      const name = e.name || ''
      const key = toFieldKey(name)
      if (!key || key === 'submit' || key === 'cancel') return
      if ((e.type === 'radio' || e.type === 'checkbox') && out[key] !== undefined) return
      if (name.includes('][') && out[key] !== undefined) return
      const v = getVal(e)
      if (v !== undefined && (Array.isArray(v) ? v.length > 0 : true)) out[key] = v
    })
    return out
  }, [formId, getFormInstance])

  useEffect(() => {
    if (isInitializing.current || !initialTabSet.current) return
    const formElement = document.querySelector(`.formio-container-${formId}`)
    if (!formElement) return

    const observer = new MutationObserver(() => {
      if (isInitializing.current) return
      const activeTab = formElement.querySelector('.nav-tabs .nav-link.active')
      if (activeTab) {
        const tabLinks = formElement.querySelectorAll('.nav-tabs .nav-link')
        const tabIndex = Array.from(tabLinks).indexOf(activeTab)
        if (tabIndex !== -1 && tabIndex !== currentTabIndex) {
          const currentData = captureFormData()
          if (currentData && Object.keys(currentData).length > 0) {
            setFormData(prev => ({ ...prev, ...currentData }))
          }
          setCurrentTabIndex(tabIndex)
          const urlRecordId = searchParams.get('id')
          if (urlRecordId && !isInitializing.current) {
            updateUrlTab(tabIndex)
          }
        }
      }
    })

    observer.observe(formElement, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class']
    })

    return () => observer.disconnect()
  }, [formId, currentTabIndex, searchParams, updateUrlTab, captureFormData])

  // Save data to API
  const saveToAPI = useCallback(async (dataToSave: Record<string, any>): Promise<{ success: boolean; recordId?: number }> => {
    try {
      const response = await fetch('/api/forms/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId: formId,
          stepIndex: currentTabIndex,
          data: dataToSave,
          recordId: recordId,
        }),
      })

      if (!response.ok) {
        return { success: false }
      }

      const result = await response.json()
      
      // Update record ID if returned (new record was created)
      if (result.recordId && !recordId) {
        setRecordId(result.recordId)
      }
      
      return { success: true, recordId: result.recordId || recordId }
    } catch (error) {
      console.error('Save error:', error)
      return { success: false }
    }
  }, [formId, currentTabIndex, recordId])

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsSubmitting(true)
      
      // Capture current form data
      const currentData = captureFormData()
      const allData = { ...formData, ...currentData }
      
      // Save to database first
      const saveResult = await saveToAPI(allData)
      
      if (!saveResult.success) {
        throw new Error('Failed to save form data before submission')
      }
      
      // Then submit the form
      const response = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          formId,
          data: allData,
        }),
      })

      const result = await response.json()

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit form')
      }

      alert(result.message || 'Form submitted successfully!')
    } catch (error: any) {
      console.error('Submit error:', error)
      alert(`Failed to submit: ${error.message}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle button click
  const handleButtonClick = async (button: ButtonConfig) => {
    const action = button.action?.toLowerCase() || 'button'
    
    const switchTab = (direction: 'next' | 'previous') => {
      const formElement = document.querySelector(`.formio-container-${formId}`)
      if (!formElement) {
        console.warn('Form element not found for tab switching')
        return
      }
      
      const tabLinks = formElement.querySelectorAll('.nav-tabs .nav-link')
      if (tabLinks.length === 0) {
        console.warn('No tab links found')
        return
      }
      
      const activeTab = formElement.querySelector('.nav-tabs .nav-link.active')
      if (!activeTab) {
        console.warn('No active tab found')
        return
      }
      
      const currentIndex = Array.from(tabLinks).indexOf(activeTab as Element)
      let newIndex = currentIndex
      
      if (direction === 'next' && currentIndex < tabLinks.length - 1) {
        newIndex = currentIndex + 1
      } else if (direction === 'previous' && currentIndex > 0) {
        newIndex = currentIndex - 1
      }
      
      if (newIndex !== currentIndex && tabLinks[newIndex]) {
        // Use both click and Bootstrap's tab API if available
        const targetTab = tabLinks[newIndex] as HTMLElement
        
        // Try Bootstrap tab API first
        if ((window as any).bootstrap) {
          const tab = (window as any).bootstrap.Tab.getOrCreateInstance(targetTab)
          if (tab && typeof tab.show === 'function') {
            tab.show()
            setCurrentTabIndex(newIndex)
            return
          }
        }
        
        // Fallback to click
        targetTab.click()
        setCurrentTabIndex(newIndex)
      } else {
        console.warn(`Cannot switch tab: currentIndex=${currentIndex}, newIndex=${newIndex}, totalTabs=${tabLinks.length}`)
      }
    }
    
    switch (action) {
      case 'previous':
      case 'prev':
      case 'back':
        const prevData = captureFormData()
        setFormData((prev) => ({ ...prev, ...prevData }))
        switchTab('previous')
        break
        
      case 'next':
      case 'continue':
        // Last tab: run Save & Exit (capture, save, redirect)
        const formElementForTabs = document.querySelector(`.formio-container-${formId}`)
        const tabLinksForCheck = formElementForTabs?.querySelectorAll('.nav-tabs .nav-link') ?? []
        if (currentTabIndex >= tabLinksForCheck.length - 1) {
          const saveExitData = captureFormData()
          const allSaveExitData = { ...formData, ...saveExitData }
          setFormData(allSaveExitData)
          setIsSaving(true)
          const saveExitResult = await saveToAPI(allSaveExitData)
          setIsSaving(false)
          if (saveExitResult.success) {
            window.location.href = '/forms/tab-application'
          } else {
            alert('Failed to save form data. Please try again.')
          }
          break
        }

        // Check if we can go to next tab
        const formElement = document.querySelector(`.formio-container-${formId}`)
        if (!formElement) {
          console.error('Form element not found')
          break
        }
        
        const tabLinks = formElement.querySelectorAll('.nav-tabs .nav-link')
        if (currentTabIndex >= tabLinks.length - 1) {
          break
        }
        
        // Capture and save form data before switching (FormIO native + fallbacks)
        const nextData = await captureFormData()
        const allNextData = { ...formData, ...nextData }
        setFormData(allNextData)
        
        setIsSaving(true)
        const nextSaveResult = await saveToAPI(allNextData)
        setIsSaving(false)
        
        if (nextSaveResult.success) {
          const newTabIndex = currentTabIndex + 1
          
          // Update URL with record ID if we have one
          if (nextSaveResult.recordId) {
            setRecordId(nextSaveResult.recordId)
            updateUrlWithId(nextSaveResult.recordId, newTabIndex)
          } else {
            updateUrlTab(newTabIndex)
          }
          
          // Update state first
          setCurrentTabIndex(newTabIndex)
          
          const MAX_ATTEMPTS = 5
          const performTabSwitch = (attempt = 1): boolean => {
            const currentFormElement = document.querySelector(`.formio-container-${formId}`)
            const currentTabLinks = currentFormElement?.querySelectorAll('.nav-tabs .nav-link') ?? []
            const nextTabLink = currentTabLinks[newTabIndex] as HTMLElement | undefined

            if (!currentFormElement || currentTabLinks.length === 0 || newTabIndex >= currentTabLinks.length || !nextTabLink) {
              if (attempt >= MAX_ATTEMPTS) console.warn('Tab switch failed: form or tab elements not ready')
              return false
            }

            const originalHref = nextTabLink.getAttribute('href')
            if (originalHref && originalHref !== '#' && !originalHref.startsWith('#')) {
              nextTabLink.setAttribute('data-original-href', originalHref)
              nextTabLink.setAttribute('href', '#')
            }
            
            const activeTab = currentFormElement.querySelector('.nav-tabs .nav-link.active')
            if (activeTab) {
              activeTab.classList.remove('active')
              activeTab.setAttribute('aria-selected', 'false')
            }
            
            nextTabLink.classList.add('active')
            nextTabLink.setAttribute('aria-selected', 'true')
            
            // Hide current tab pane and show next tab pane
            const tabPanes = currentFormElement.querySelectorAll('.tab-pane')
            if (tabPanes.length > 0) {
              tabPanes.forEach((pane, idx) => {
                if (idx === currentTabIndex) {
                  pane.classList.remove('active', 'show')
                } else if (idx === newTabIndex) {
                  pane.classList.add('active', 'show')
                }
              })
            }
            
            const formInstance = getFormInstance() || (currentFormElement as any).formio
            let switched = false
            
            if (formInstance) {
              // Try setPage method (for wizard/stepper forms)
              if (typeof formInstance.setPage === 'function') {
                try {
                  formInstance.setPage(newTabIndex)
                  switched = true
                } catch (e) {
                  // FormIO setPage failed
                }
              }
              
              // Try setValue method for tabs component
              if (!switched && formInstance.components) {
                const tabsComponent = formInstance.components.find((comp: any) => 
                  comp.type === 'tabs' || comp.type === 'panel'
                )
                if (tabsComponent) {
                  // Try different methods to switch tabs
                  if (typeof tabsComponent.setValue === 'function') {
                    try { tabsComponent.setValue(newTabIndex); switched = true } catch { /* setValue failed */ }
                  }
                  if (!switched && typeof tabsComponent.setActiveTab === 'function') {
                    try { tabsComponent.setActiveTab(newTabIndex); switched = true } catch { /* setActiveTab failed */ }
                  }
                }
              }
            }
            
            // Fallback: Use click event
            if (!switched) {
              try {
                // Prevent default navigation
                const preventNav = (e: Event) => {
                  e.preventDefault()
                  e.stopPropagation()
                }
                nextTabLink.addEventListener('click', preventNav, { once: true })
                const clickEvent = new MouseEvent('click', {
                  bubbles: true,
                  cancelable: true,
                  view: window
                })
                nextTabLink.dispatchEvent(clickEvent)
                
                // Also try direct click
                nextTabLink.click()
                switched = true
              } catch (e) {
                console.error('Click method failed:', e)
              }
            }
            
            if (originalHref && originalHref !== '#') {
              setTimeout(() => {
                const savedHref = nextTabLink.getAttribute('data-original-href')
                if (savedHref) {
                  nextTabLink.setAttribute('href', savedHref)
                  nextTabLink.removeAttribute('data-original-href')
                }
              }, 200)
            }
            
            return switched
          }
          
          let attempt = 1
          const runWithRetry = () => {
            if (!performTabSwitch(attempt) && attempt < MAX_ATTEMPTS) {
              attempt++
              setTimeout(runWithRetry, 100 * attempt)
            }
          }
          runWithRetry()
        } else {
          alert('Failed to save form data. Please try again.')
        }
        break
        
      case 'submit':
      case 'finish':
      case 'complete':
        handleSubmit()
        break
        
      case 'saveandexit':
      case 'save & exit':
      case 'saveexit':
        // Capture and save form data, then redirect
        const saveExitData = captureFormData()
        const allSaveExitData = { ...formData, ...saveExitData }
        setFormData(allSaveExitData)
        
        setIsSaving(true)
        const saveExitResult = await saveToAPI(allSaveExitData)
        setIsSaving(false)
        
        if (saveExitResult.success) {
          // Redirect to pending forms page
          window.location.href = '/forms/tab-application'
        } else {
          alert('Failed to save form data. Please try again.')
        }
        break
        
      default:
        // Button action not handled
    }
  }

  // Render button
  const isLastTab = currentTabIndex >= tabButtons.length - 1
  const renderButton = (button: ButtonConfig, index: number) => {
    const action = button.action?.toLowerCase() || 'button'
    const isNextOnLastTab = isLastTab && (action === 'next' || action === 'continue')
    const displayLabel = isNextOnLastTab ? 'Submit' : (button.label || 'Button')
    
    // Determine button styling
    let buttonClass = 'px-5 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center gap-2'
    
    if (action === 'submit' || action === 'finish' || action === 'complete' || isNextOnLastTab) {
      buttonClass += ' bg-green-600 text-white hover:bg-green-700'
    } else if (action === 'saveandexit' || action === 'save & exit' || action === 'saveexit') {
      buttonClass += ' bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 hover:border-gray-400'
    } else if (action === 'previous' || action === 'prev' || action === 'back') {
      buttonClass += currentTabIndex === 0 
        ? ' bg-gray-100 text-gray-400 cursor-not-allowed'
        : ' bg-gray-200 text-gray-700 hover:bg-gray-300'
    } else if (action === 'next' || action === 'continue') {
      buttonClass += ' bg-blue-600 text-white hover:bg-blue-700'
    } else {
      buttonClass += ' bg-gray-200 text-gray-700 hover:bg-gray-300'
    }

    if (button.disabled || isSubmitting || isSaving) {
      buttonClass += ' opacity-50 cursor-not-allowed'
    }

    if (button.customClass) {
      buttonClass += ` ${button.customClass}`
    }

    const isDisabled = button.disabled || isSubmitting || isSaving || 
      (action === 'previous' && currentTabIndex === 0)

    return (
      <button
        key={button.key || button.id || `btn-${index}`}
        onClick={() => !isDisabled && handleButtonClick(button)}
        disabled={isDisabled}
        className={buttonClass}
        type="button"
      >
        {(isSubmitting && (action === 'submit' || action === 'finish' || action === 'complete')) ||
         (isSaving && (action === 'next' || action === 'continue' || action === 'saveandexit' || action === 'save & exit' || action === 'saveexit' || isNextOnLastTab)) ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            {isSubmitting ? 'Submitting...' : 'Saving...'}
          </>
        ) : (
          <>
            {action === 'previous' || action === 'prev' || action === 'back' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            ) : action === 'next' || action === 'continue' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            ) : action === 'saveandexit' || action === 'save & exit' || action === 'saveexit' ? (
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
              </svg>
            ) : null}
            {displayLabel}
          </>
        )}
      </button>
    )
  }

  // Get current tab buttons
  const currentTabButtons = tabButtons.find((tb, index) => index === currentTabIndex)?.buttons || []

  return (
    <>
      <FormIOCSSLoader />
      
      {/* Form Content */}
      <div className="mb-6">
        <div className={`formio-container-${formId}`}>
          {isLoadingData ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading saved form data...</span>
            </div>
          ) : (
            <FormIORender
              key={`tabs-form-${formId}-${recordId || 'new'}-${dataLoadedKey}`}
              formSchema={formSchema}
              formId={formId}
              submitButtonText={submitButtonText}
              initialData={formData}
            />
          )}
        </div>
      </div>

      {/* Custom Navigation Buttons */}
      {currentTabButtons.length > 0 && (
        <div className="flex justify-between items-center pt-4 border-t border-gray-200">
          <div className="flex gap-3">
            {currentTabButtons
              .filter(btn => {
                const action = btn.action?.toLowerCase() || ''
                return action === 'previous' || action === 'prev' || action === 'back' || 
                       action === 'saveandexit' || action === 'save & exit' || action === 'saveexit'
              })
              .map((button, index) => renderButton(button, index))}
          </div>

          <div className="flex gap-3">
            {currentTabButtons
              .filter(btn => {
                const action = btn.action?.toLowerCase() || ''
                return action === 'next' || action === 'continue' || 
                       action === 'submit' || action === 'finish' || action === 'complete'
              })
              .map((button, index) => renderButton(button, index))}
          </div>
        </div>
      )}
    </>
  )
}
