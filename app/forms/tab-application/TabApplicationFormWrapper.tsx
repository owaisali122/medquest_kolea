'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import FormIORender from '@/app/components/FormIORender'
import { FormIOCSSLoader } from '@/app/components/formio/FormIOCSSLoader'
import {
  useAppDispatch,
  useAppSelector,
  initializeStepper,
  updateFormData,
  setRecordId,
  goToStep,
  previousStep,
  resetStepper,
} from '@/lib/store'

const LISTING_URL = '/forms'

function getTotalTabs(schema: any): number {
  if (!schema?.components) return 0
  const tabsComp = schema.components.find((c: any) => c.type === 'tabs' || c.type === 'panel')
  return tabsComp?.components?.length ?? 0
}

function toFieldKey(name: string): string {
  if (!name) return name
  let key = name
  if (name.startsWith('data[') && name.endsWith(']')) key = name.slice(5, -1)
  else if (name.startsWith('data.')) key = name.slice(5)
  if (key.includes('][')) key = key.split('][')[0]
  return key
}

interface TabApplicationFormWrapperProps {
  formSchema: any
  formId: number
  submitButtonText?: string
  recordId?: string | null
  initialTab?: number
}

export function TabApplicationFormWrapper({
  formSchema,
  formId,
  submitButtonText = 'Submit',
  recordId: recordIdProp,
  initialTab = 0,
}: TabApplicationFormWrapperProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const dispatch = useAppDispatch()
  const { formData, recordId: storeRecordId, currentStep } = useAppSelector((s) => s.stepper)

  const [currentTabIndex, setCurrentTabIndex] = useState(0)
  const [isSaving, setIsSaving] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(!!recordIdProp)
  const [dataLoadedKey, setDataLoadedKey] = useState(0)
  /** Stable initial data for FormIO - only set on load so FormIO does not remount on Redux updates */
  const [initialFormData, setInitialFormData] = useState<Record<string, any>>({})
  /** Incremented on Next/Previous to force FormIO remount and reinitialize the tab */
  const [remountKey, setRemountKey] = useState(0)
  /** Snapshot of form data passed to FormIO when remounting after tab change */
  const [remountInitialData, setRemountInitialData] = useState<Record<string, any>>({})
  const formDataRef = useRef<Record<string, any>>({})
  const initializedForRecord = useRef<string | null>(null)

  const totalTabs = getTotalTabs(formSchema)
  const recordId = recordIdProp ?? (storeRecordId !== null ? String(storeRecordId) : null)

  // Initialize from URL and load saved data (edit mode)
  useEffect(() => {
    const key = recordId ?? 'new'
    if (initializedForRecord.current === key) return
    initializedForRecord.current = key

    if (!recordId) {
      dispatch(resetStepper())
      dispatch(initializeStepper({ totalSteps: Math.max(totalTabs, 1), currentStep: 0, formData: {}, recordId: null }))
      setInitialFormData({})
      const tabFromUrl = searchParams.get('currentTab')
      const tab = tabFromUrl !== null && tabFromUrl !== '' ? parseInt(tabFromUrl, 10) : 0
      setCurrentTabIndex(totalTabs > 0 ? Math.min(tab, totalTabs - 1) : 0)
      setIsLoadingData(false)
      return
    }

    setIsLoadingData(true)
    const idNum = parseInt(recordId, 10)

    fetch(`/api/forms/get-session-state?recordId=${idNum}`)
      .then((res) => res.json())
      .then((state) => {
        if (state.hasSavedState && state.data) {
          const { _metadata, ...formDataOnly } = state.data
          const tab = state.currentPage ?? initialTab
          const steps = Math.max(totalTabs, 1)
          dispatch(
            initializeStepper({
              totalSteps: steps,
              currentStep: tab,
              formData: formDataOnly,
              recordId: idNum,
            })
          )
          formDataRef.current = formDataOnly
          setInitialFormData(formDataOnly)
          setDataLoadedKey((k) => k + 1)
          setCurrentTabIndex(Math.min(tab, steps - 1))
        } else {
          dispatch(initializeStepper({ totalSteps: Math.max(totalTabs, 1), formData: {}, recordId: idNum }))
          setCurrentTabIndex(0)
        }
      })
      .catch(() => {
        dispatch(initializeStepper({ totalSteps: Math.max(totalTabs, 1), formData: {}, recordId: idNum }))
        setCurrentTabIndex(0)
      })
      .finally(() => setIsLoadingData(false))
  }, [recordId, totalTabs, dispatch, initialTab, searchParams])

  // Sync ref and tab index from Redux when we have recordId
  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  useEffect(() => {
    if (recordId && currentStep !== currentTabIndex) {
      setCurrentTabIndex(currentStep)
    }
  }, [recordId, currentStep, currentTabIndex])

  const getFormInstance = useCallback((): any => {
    const mount = document.querySelector(`.formio-container-tab-app-${formId} [data-formio-mount]`)
    return (mount as any)?.formio ?? null
  }, [formId])

  /** Switch FormIO to the given tab index using FormIO/Bootstrap API (no manual DOM flicker). */
  const switchFormIOTab = useCallback(
    (tabIndex: number) => {
      const formInstance = getFormInstance()
      const formElement = document.querySelector(`.formio-container-tab-app-${formId}`)
      if (!formElement) return

      const tabLinks = formElement.querySelectorAll('.nav-tabs .nav-link')
      if (tabIndex < 0 || tabIndex >= tabLinks.length) return

      const targetTab = tabLinks[tabIndex] as HTMLElement

      // 1) FormIO form instance API (recommended)
      if (formInstance) {
        if (typeof formInstance.setPage === 'function') {
          try {
            formInstance.setPage(tabIndex)
            return
          } catch (_) {}
        }
        const tabsComp = formInstance.components?.find(
          (c: any) => c.type === 'tabs' || c.type === 'panel'
        )
        if (tabsComp) {
          if (typeof tabsComp.setValue === 'function') {
            try {
              tabsComp.setValue(tabIndex)
              return
            } catch (_) {}
          }
          if (typeof tabsComp.setActiveTab === 'function') {
            try {
              tabsComp.setActiveTab(tabIndex)
              return
            } catch (_) {}
          }
        }
      }

      // 2) Bootstrap Tab API
      if (typeof (window as any).bootstrap !== 'undefined') {
        const Tab = (window as any).bootstrap.Tab
        if (Tab?.getOrCreateInstance) {
          try {
            const tab = Tab.getOrCreateInstance(targetTab)
            if (tab?.show) {
              tab.show()
              return
            }
          } catch (_) {}
        }
      }

      // 3) Fallback: trigger click
      targetTab.click()
    },
    [formId, getFormInstance]
  )

  const captureFormData = useCallback((): Record<string, any> => {
    const formElement = document.querySelector(`.formio-container-tab-app-${formId}`)
    if (!formElement) return {}
    const formInstance = getFormInstance()
    const out: Record<string, any> = formInstance?.data ? { ...formInstance.data } : {}

    const scope = formElement.querySelector('.tab-pane.active') || formElement
    const getVal = (e: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement) => {
      if (e.type === 'checkbox') return (e as HTMLInputElement).checked ? (e as HTMLInputElement).value || true : false
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
      const v = getVal(e)
      if (v !== undefined && (Array.isArray(v) ? v.length > 0 : true)) out[key] = v
    })
    return out
  }, [formId, getFormInstance])

  const restoreFormData = useCallback(
    async (dataToRestore: Record<string, any>) => {
      const formInstance = getFormInstance()
      const formElement = document.querySelector(`.formio-container-tab-app-${formId}`)
      if ((!formInstance && !formElement) || !dataToRestore || Object.keys(dataToRestore).length === 0) return
      try {
        if (formInstance?.ready) await formInstance.ready
        if (formInstance?.setSubmission) {
          await formInstance.setSubmission({ data: { ...dataToRestore } }, { noValidate: true })
        }
        if (formInstance?.redraw) await formInstance.redraw()
      } catch (e) {
        console.warn('restoreFormData', e)
      }
    },
    [formId, getFormInstance]
  )

  // Restore form UI only after initial load from DB (prevents flicker on Next/Redux updates)
  const lastRestoredKeyRef = useRef(-1)
  useEffect(() => {
    if (dataLoadedKey <= 0 || dataLoadedKey === lastRestoredKeyRef.current) return
    if (Object.keys(formData).length === 0) return
    lastRestoredKeyRef.current = dataLoadedKey
    restoreFormData(formData)
  }, [dataLoadedKey, formData, restoreFormData])

  // After initial load or remount, switch FormIO to the correct tab when it's not 0
  useEffect(() => {
    if (currentTabIndex <= 0) return
    const t = setTimeout(() => switchFormIOTab(currentTabIndex), remountKey > 0 ? 400 : 300)
    return () => clearTimeout(t)
  }, [dataLoadedKey, currentTabIndex, remountKey, switchFormIOTab])

  // Observe tab changes to sync currentTabIndex and URL
  useEffect(() => {
    const formElement = document.querySelector(`.formio-container-tab-app-${formId}`)
    if (!formElement || totalTabs === 0) return
    const observer = new MutationObserver(() => {
      const activeTab = formElement.querySelector('.nav-tabs .nav-link.active')
      if (activeTab) {
        const tabLinks = formElement.querySelectorAll('.nav-tabs .nav-link')
        const idx = Array.from(tabLinks).indexOf(activeTab)
        if (idx !== -1 && idx !== currentTabIndex) {
          const currentData = captureFormData()
          if (Object.keys(currentData).length > 0) {
            dispatch(updateFormData(currentData))
          }
          setCurrentTabIndex(idx)
        }
      }
    })
    observer.observe(formElement, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] })
    return () => observer.disconnect()
  }, [formId, totalTabs, currentTabIndex, dispatch, captureFormData])

  const saveToAPI = useCallback(
    async (dataToSave: Record<string, any>): Promise<{ success: boolean; recordId?: number }> => {
      const res = await fetch('/api/forms/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          formId,
          stepIndex: currentTabIndex,
          data: dataToSave,
          recordId: recordId ? parseInt(recordId, 10) : null,
        }),
      })
      if (!res.ok) return { success: false }
      const result = await res.json()
      if (result.recordId && !recordId) {
        dispatch(setRecordId(result.recordId))
      }
      return { success: true, recordId: result.recordId ?? (recordId ? parseInt(recordId, 10) : undefined) }
    },
    [formId, currentTabIndex, recordId, dispatch]
  )

  const updateUrl = useCallback(
    (id: number | null, tab: number) => {
      const path = id !== null ? `/forms/tab-application/${id}` : '/forms/tab-application/new'
      const url = `${path}?currentTab=${tab}`
      router.replace(url)
    },
    [router]
  )

  const handleSaveAndExit = async () => {
    const currentData = captureFormData()
    const merged = { ...formData, ...currentData }
    dispatch(updateFormData(currentData))
    setIsSaving(true)
    const result = await saveToAPI(merged)
    setIsSaving(false)
    if (result.success) {
      router.push(LISTING_URL)
    } else {
      alert('Failed to save. Please try again.')
    }
  }

  const handleCancel = () => {
    router.push(LISTING_URL)
  }

  const handleNext = async () => {
    const currentData = captureFormData()
    const merged = { ...formData, ...currentData }
    dispatch(updateFormData(currentData))

    const isLastTab = currentTabIndex >= totalTabs - 1
    if (isLastTab) {
      await handleSaveAndExit()
      return
    }

    setIsSaving(true)
    const result = await saveToAPI(merged)
    setIsSaving(false)
    if (!result.success) {
      alert('Failed to save. Please try again.')
      return
    }

    if (result.recordId) {
      dispatch(setRecordId(result.recordId))
    }
    const nextTab = currentTabIndex + 1
    const newId = result.recordId ?? (recordId ? parseInt(recordId, 10) : null)

    setRemountInitialData(merged)
    setRemountKey((k) => k + 1)
    dispatch(goToStep(nextTab))
    setCurrentTabIndex(nextTab)
    updateUrl(newId ?? null, nextTab)
  }

  const handlePrevious = () => {
    if (currentTabIndex <= 0) return
    const currentData = captureFormData()
    const merged = { ...formData, ...currentData }
    dispatch(updateFormData(currentData))

    const prevTab = currentTabIndex - 1
    setRemountInitialData(merged)
    setRemountKey((k) => k + 1)
    dispatch(previousStep())
    setCurrentTabIndex(prevTab)
    updateUrl(recordId ? parseInt(recordId, 10) : null, prevTab)
  }

  // Hide FormIO default submit/cancel buttons
  useEffect(() => {
    const style = document.createElement('style')
    style.textContent = `
      .formio-container-tab-app-${formId} button[type="submit"],
      .formio-container-tab-app-${formId} button[data-action="submit"],
      .formio-container-tab-app-${formId} .formio-actions button[type="submit"],
      .formio-container-tab-app-${formId} .formio-component-tabnavigationbuttons,
      .formio-container-tab-app-${formId} [data-type="tabnavigationbuttons"] { display: none !important; }
    `
    document.head.appendChild(style)
    return () => { document.head.removeChild(style) }
  }, [formId])

  const isLastTab = currentTabIndex >= totalTabs - 1

  if (isLoadingData) {
    return (
      <>
        <FormIOCSSLoader />
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <span className="ml-3 text-gray-600">Loading saved form data...</span>
        </div>
      </>
    )
  }

  return (
    <>
      <FormIOCSSLoader />
      <div className={`formio-container-tab-app-${formId}`}>
        <FormIORender
          key={`tab-app-${formId}-${recordId ?? 'new'}-${dataLoadedKey}-${remountKey}`}
          formSchema={formSchema}
          formId={formId}
          submitButtonText={submitButtonText}
          initialData={remountKey === 0 ? initialFormData : remountInitialData}
        />
      </div>

      <div className="flex justify-between items-center pt-4 mt-6 border-t border-gray-200">
        <div className="flex gap-3">
          <button
            type="button"
            onClick={handleSaveAndExit}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save & Exit'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="px-5 py-2.5 rounded-lg font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handlePrevious}
            disabled={currentTabIndex === 0 || isSaving}
            className="px-5 py-2.5 rounded-lg font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50 flex items-center gap-2"
          >
            Previous
          </button>
        </div>
        <div>
          <button
            type="button"
            onClick={handleNext}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
          >
            {isSaving ? 'Saving...' : isLastTab ? submitButtonText : 'Next'}
          </button>
        </div>
      </div>
    </>
  )
}
