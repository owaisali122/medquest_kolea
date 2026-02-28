'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import FormIORenderWizardWithSlug from '@/app/components/formio/FormIORenderWizardWithSlug'

export default function EditFormSubmissionPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams?.get('slug') || ''
  const id = (params?.id as string) || ''
  const recordId = id ? parseInt(id, 10) : 0
  const listUrl = slug ? `/forms/submissions?slug=${encodeURIComponent(slug)}` : '/forms/submissions'

  const [initialData, setInitialData] = useState<Record<string, any>>({})
  const [initialPage, setInitialPage] = useState<number | undefined>(undefined)
  const [maxFilledStep, setMaxFilledStep] = useState<number | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const loadedIdRef = useRef<string | null>(null)

  useEffect(() => {
    if (!id) return
    if (loadedIdRef.current === id) return
    loadedIdRef.current = id
    const urlStep = searchParams?.get('step')
    const load = async () => {
      try {
        setLoadError(null)
        const res = await fetch(`/api/forms/get-session-state?recordId=${id}`)
        if (!res.ok) throw new Error('Failed to load record')
        const data = await res.json()
        setInitialData(data?.data || {})
        const pageFromUrl = urlStep != null ? parseInt(urlStep, 10) : NaN
        const pageFromApi = data?.currentPage
        setInitialPage(!isNaN(pageFromUrl) ? pageFromUrl : (pageFromApi != null ? pageFromApi : undefined))
        setMaxFilledStep(data?.maxStepIndex)
      } catch (err: any) {
        setLoadError(err.message || 'Failed to load record')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  const handleSuccess = () => router.push(listUrl)

  const handlePrevious = async (state: any) => {
    const wizard = state.formInstanceRef.current?.root || state.formInstanceRef.current
    if (wizard?.prevPage) {
      await wizard.prevPage()
      const newPage = (state.currentPage ?? 1) - 1
      router.replace(`/forms/submissions/${recordId}?slug=${encodeURIComponent(slug)}&step=${newPage}`)
    }
  }

  const handleNext = async (state: any) => {
    const form = state.formInstanceRef.current
    if (!form) return
    const wizard = form.root || form
    const data = form.submission?.data ?? {}
    const isValid = wizard?.checkValidity ? wizard.checkValidity(data, true, data, true) : form.checkValidity?.(data, true) !== false
    if (!isValid) return

    const cleanData = { ...(form.submission?.data || {}) }
    delete cleanData.submit
    delete cleanData.cancel
    const page = wizard?.page ?? form.page ?? 0

    const res = await fetch('/api/forms/save-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: state.formId, stepIndex: page, data: cleanData, recordId: state.recordId }),
    })
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')

    const pages = wizard?.pages || form.pages || []
    if (page >= pages.length - 1) {
      const submitRes = await fetch('/api/forms/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: state.formId, data: cleanData }),
      })
      if (!submitRes.ok) throw new Error((await submitRes.json()).error || 'Failed to submit')
      handleSuccess()
      return
    }
    if (wizard?.nextPage) {
      await wizard.nextPage()
      router.replace(`/forms/submissions/${recordId}?slug=${encodeURIComponent(slug)}&step=${page + 1}`)
    }
  }

  const handleSaveExit = async (state: any) => {
    const form = state.formInstanceRef.current
    if (!form) return
    const cleanData = { ...(form.submission?.data || {}) }
    delete cleanData.submit
    delete cleanData.cancel
    const page = form.root?.page ?? form.page ?? 0

    const res = await fetch('/api/forms/save-step', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ formId: state.formId, stepIndex: page, data: cleanData, recordId: state.recordId }),
    })
    if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
    handleSuccess()
  }

  if (!id) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-600">Invalid record ID</p></div>
  if (!slug) return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
          <p className="text-amber-700">Form slug required. Use ?slug=wizard in the URL.</p>
        </div>
      </div>
    </div>
  )
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
        <p className="text-gray-600">Loading...</p>
      </div>
    </div>
  )
  if (loadError) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
        <p className="text-red-600">{loadError}</p>
        <button type="button" onClick={() => router.push(listUrl)} className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200">Back</button>
      </div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <FormIORenderWizardWithSlug
            slug={slug}
            recordId={recordId}
            initialData={initialData}
            initialPage={initialPage}
            maxFilledStep={maxFilledStep}
            onSuccess={handleSuccess}
            onError={(e) => console.error(e)}
            onPrevious={handlePrevious}
            onNext={handleNext}
            onSaveExit={handleSaveExit}
          />
        </div>
      </div>
    </div>
  )
}
