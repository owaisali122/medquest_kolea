'use client'

import { useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import FormIORenderGenericWithSlug from '@/app/components/formio/FormIORenderGenericWithSlug'

export default function NewFormSubmissionPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const slug = searchParams?.get('slug') || ''
  const [draftId, setDraftId] = useState<number | null>(null)

  const handleSuccess = () => router.push(`/forms/submissions?slug=${encodeURIComponent(slug)}`)

  const handlePrevious = async (state: any) => {
    const wizard = state.formInstanceRef.current?.root || state.formInstanceRef.current
    if (wizard?.prevPage) await wizard.prevPage()
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

    if (draftId) {
      const res = await fetch('/api/forms/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: state.formId, stepIndex: page, data: cleanData, recordId: draftId }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
    } else {
      const res = await fetch('/api/forms/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: state.formId, stepIndex: page, data: cleanData }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to save')
      const newRecordId = result.recordId
      setDraftId(newRecordId)
      const currentStepIndex = page + 1
      router.push(`/forms/submissions/${newRecordId}?slug=${encodeURIComponent(slug)}&step=${currentStepIndex}`)
      return
    }

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
    if (wizard?.nextPage) await wizard.nextPage()
  }

  const handleSaveExit = async (state: any) => {
    const form = state.formInstanceRef.current
    if (!form) return
    const cleanData = { ...(form.submission?.data || {}) }
    delete cleanData.submit
    delete cleanData.cancel
    const page = form.root?.page ?? form.page ?? 0

    if (draftId) {
      const res = await fetch('/api/forms/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: state.formId, stepIndex: page, data: cleanData, recordId: draftId }),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Failed to save')
    } else {
      const res = await fetch('/api/forms/save-step', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ formId: state.formId, stepIndex: page, data: cleanData }),
      })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || 'Failed to save')
      setDraftId(result.recordId)
    }
    handleSuccess()
  }

  if (!slug) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <p className="text-amber-700">Form slug required. Use ?slug=wizard in the URL.</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Add New</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <FormIORenderGenericWithSlug
            slug={slug}
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
