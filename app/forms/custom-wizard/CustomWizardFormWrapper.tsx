'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { CustomWizardForm, type CustomWizardStepConfig } from './CustomWizardForm'
import { useAppDispatch, useAppSelector } from '@/lib/store/hooks'
import {
  initializeStepper,
  updateFormData,
  setRecordId as setRecordIdRedux,
} from '@/lib/store/stepperSlice'

function getErrorMessage(body: any, fallback: string): string {
  const e = body?.error
  if (e == null) return fallback
  if (typeof e === 'string') return e
  if (Array.isArray(e)) {
    const parts = e.map((x: any) => {
      if (typeof x === 'string') return x
      if (x && typeof x === 'object' && x.message != null) return String(x.message)
      return null
    }).filter(Boolean) as string[]
    return parts.length ? parts.join(', ') : fallback
  }
  if (typeof e === 'object' && e.message != null) return String(e.message)
  return fallback
}

export function CustomWizardFormWrapper({ steps }: { steps: CustomWizardStepConfig[] }) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const dispatch = useAppDispatch()
  const formData = useAppSelector((state) => state.stepper?.formData ?? {}) as Record<string, unknown>
  const safeSteps = Array.isArray(steps) ? steps : []
  const [sessionData, setSessionData] = useState<Record<string, unknown>>({})
  const [recordId, setRecordId] = useState<number | null>(null)
  const [startIndex, setStartIndex] = useState(0)
  const [loading, setLoading] = useState(true)
  const primaryFormId = safeSteps[0]?.form?.id ?? 0
  const hasInitializedRedux = useRef(false)

  useEffect(() => {
    const id = searchParams?.get('id')
    const stepParam = searchParams?.get('step')
    if (!id) {
      setLoading(false)
      if (stepParam != null) setStartIndex(Math.max(0, parseInt(stepParam, 10)))
      return
    }
    const idNum = parseInt(id, 10)
    if (isNaN(idNum)) {
      setLoading(false)
      return
    }
    hasInitializedRedux.current = false
    let cancelled = false
    fetch(`/api/forms/get-session-state?recordId=${idNum}`)
      .then((res) => res.ok ? res.json() : null)
      .then((state) => {
        if (cancelled) return
        const rid = state?.recordId ?? idNum
        const step = stepParam != null ? parseInt(stepParam, 10) : state?.currentPage
        const stepIndex = !isNaN(step) && step >= 0 && step < safeSteps.length ? step : 0
        const data = state?.hasSavedState && state?.data && typeof state.data === 'object' && Object.keys(state.data).length > 0 ? state.data : {}
        dispatch(initializeStepper({ totalSteps: safeSteps.length, formData: data, recordId: rid, currentStep: stepIndex }))
        hasInitializedRedux.current = true
        setRecordId(rid)
        setSessionData(data)
        setStartIndex(stepIndex)
      })
      .catch(() => { if (!cancelled) setRecordId(idNum) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [searchParams?.get('id'), searchParams?.get('step'), safeSteps.length, dispatch])

  useEffect(() => {
    if (loading || safeSteps.length === 0 || hasInitializedRedux.current) return
    hasInitializedRedux.current = true
    const initialFormData =
      sessionData && typeof sessionData === 'object' && Object.keys(sessionData).length > 0
        ? sessionData
        : {}
    dispatch(
      initializeStepper({
        totalSteps: safeSteps.length,
        formData: initialFormData,
        recordId,
        currentStep: startIndex,
      })
    )
  }, [loading, safeSteps.length, sessionData, recordId, startIndex, dispatch])

  useEffect(() => {
    if (recordId == null) return
    const url = new URL(window.location.href)
    if (url.searchParams.get('id') !== String(recordId)) {
      url.searchParams.set('id', String(recordId))
      if (!url.searchParams.has('step')) url.searchParams.set('step', '0')
      window.history.replaceState({}, '', url.toString())
    }
  }, [recordId])

  const getSchemaKeys = useCallback((stepIndex: number): string[] => {
    const schema = safeSteps[stepIndex]?.form?.schema
    const components = schema?.components ?? []
    return components.map((c: { key?: string }) => c?.key).filter(Boolean) as string[]
  }, [safeSteps])

  const getInitialDataForStep = useCallback((_stepIndex: number, _formId: number): Record<string, unknown> => {
    return (formData && typeof formData === 'object' ? { ...formData } : {}) as Record<string, unknown>
  }, [formData])

  const mergeStepData = useCallback((stepIndex: number, stepData: Record<string, unknown>) => {
    const base = formData && typeof formData === 'object' ? formData : {}
    const keys = getSchemaKeys(stepIndex)
    const filtered: Record<string, unknown> = {}
    keys.forEach((k) => { if (stepData[k] !== undefined) filtered[k] = stepData[k] })
    return { ...base, ...filtered }
  }, [formData, getSchemaKeys])

  const onNext = useCallback(async (stepIndex: number, stepData: Record<string, unknown>) => {
    const merged = mergeStepData(stepIndex, stepData)
    dispatch(updateFormData(merged))
    const res = await fetch('/api/forms/save-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formId: primaryFormId,
        stepIndex,
        data: merged,
        recordId: recordId ?? undefined,
      }),
    })
    const result = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(getErrorMessage(result, 'Failed to save'))
    if (result.recordId && !recordId) {
      setRecordId(result.recordId)
      dispatch(setRecordIdRedux(result.recordId))
    }
  }, [primaryFormId, recordId, mergeStepData, dispatch])

  const onBeforePrevious = useCallback((stepIndex: number, getCurrentData: () => Record<string, unknown>) => {
    const data = getCurrentData()
    const merged = mergeStepData(stepIndex, data)
    dispatch(updateFormData(merged))
  }, [mergeStepData, dispatch])

  const onSaveExit = useCallback(async (stepIndex: number, stepData: Record<string, unknown>) => {
    const merged = mergeStepData(stepIndex, stepData)
    dispatch(updateFormData(merged))
    await fetch('/api/forms/save-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formId: primaryFormId,
        stepIndex,
        data: merged,
        recordId: recordId ?? undefined,
      }),
    })
    router.push('/forms/custom-wizard')
  }, [primaryFormId, recordId, mergeStepData, router, dispatch])

  const onSubmit = useCallback(async () => {
    const merged: Record<string, unknown> = { ...formData }
    await fetch('/api/forms/save-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        formId: primaryFormId,
        stepIndex: safeSteps.length - 1,
        data: merged,
        recordId: recordId ?? undefined,
      }),
    })
    const submitRes = await fetch('/api/forms/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: primaryFormId, data: merged }),
    })
    const submitResult = await submitRes.json().catch(() => ({}))
    if (!submitRes.ok) throw new Error(getErrorMessage(submitResult, 'Failed to submit'))
    router.push('/forms/custom-wizard')
  }, [primaryFormId, recordId, formData, router])

  const onStepChange = useCallback((stepIndex: number) => {
    const url = new URL(window.location.href)
    url.searchParams.set('step', String(stepIndex))
    if (recordId != null) url.searchParams.set('id', String(recordId))
    window.history.replaceState({}, '', url.toString())
  }, [recordId])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (safeSteps.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">No steps available.</p>
      </div>
    )
  }

  return (
    <CustomWizardForm
      steps={safeSteps}
      startIndex={startIndex}
      getInitialDataForStep={getInitialDataForStep}
      onNext={onNext}
      onBeforePrevious={onBeforePrevious}
      onSaveExit={onSaveExit}
      onSubmit={onSubmit}
      onStepChange={onStepChange}
    />
  )
}
