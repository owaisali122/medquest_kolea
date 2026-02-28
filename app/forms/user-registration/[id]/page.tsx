'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useSearchParams, useRouter } from 'next/navigation'
import UserRegistrationForm from '../UserRegistrationForm'

const LIST_URL = '/forms/user-registration/list'

export default function EditUserRegistrationPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const router = useRouter()
  const id = (params?.id as string) || ''
  const recordId = id ? parseInt(id, 10) : 0

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
        setLoadError(err?.message || 'Failed to load record')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id, searchParams])

  if (!id) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Invalid record ID</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 max-w-md text-center">
          <p className="text-red-600">{loadError}</p>
          <button
            type="button"
            onClick={() => router.push(LIST_URL)}
            className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200"
          >
            Back to list
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Edit Registration</h1>
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
          <UserRegistrationForm
            recordId={recordId}
            initialData={initialData}
            initialPage={initialPage}
            maxFilledStep={maxFilledStep}
          />
        </div>
      </div>
    </div>
  )
}
