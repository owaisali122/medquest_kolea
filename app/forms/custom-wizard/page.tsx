'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

const FORM_SLUG = 'custom-review-information'

interface FormStepRecord {
  id: number
  formId: number
  formTitle: string
  formSlug: string | null
  stepIndex: number
  currentForm: number
  currentStep: number
  lastUpdated: string
  createdAt: string
  ipAddress: string | null
  userAgent: string | null
  hasData: boolean
}

interface PendingFormsResponse {
  success: boolean
  count: number
  forms: FormStepRecord[]
}

export default function CustomWizardListingPage() {
  const [forms, setForms] = useState<FormStepRecord[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    const fetchForms = async () => {
      try {
        setIsLoading(true)
        setError(null)
        const response = await fetch(
          `/api/forms/pending?formSlug=${encodeURIComponent(FORM_SLUG)}&allSessions=true`
        )
        if (!response.ok) throw new Error('Failed to fetch forms')
        const data: PendingFormsResponse = await response.json()
        if (data.success) {
          setForms(data.forms)
        } else {
          throw new Error('Failed to load forms')
        }
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load forms')
      } finally {
        setIsLoading(false)
      }
    }
    fetchForms()
  }, [])

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this record?')) return
    setDeletingId(id)
    try {
      const response = await fetch(`/api/forms/delete-record?id=${id}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Delete failed')
      setForms((prev) => prev.filter((f) => f.id !== id))
    } catch {
      setError('Failed to delete record')
    } finally {
      setDeletingId(null)
    }
  }

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    } catch {
      return dateString
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
            <h3 className="text-lg font-medium text-red-800 mb-2">Error Loading Forms</h3>
            <p className="text-red-600">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-4 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Custom Wizard</h1>
            <p className="mt-1 text-gray-600">Submissions for custom wizard</p>
          </div>
          <Link
            href="/forms/custom-wizard/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-600/20"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add New
          </Link>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="hidden md:grid md:grid-cols-12 gap-4 px-6 py-4 bg-gray-50 border-b border-gray-100 text-sm font-medium text-gray-500 uppercase tracking-wider">
            <div className="col-span-2">ID</div>
            <div className="col-span-4">Form</div>
            <div className="col-span-3">Last Updated</div>
            <div className="col-span-3 text-right">Actions</div>
          </div>

          {forms.length === 0 ? (
            <div className="px-6 py-12 text-center text-gray-500">
              No submissions yet. Click &quot;Add New&quot; to create one.
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {forms.map((row) => (
                <div
                  key={row.id}
                  className="grid grid-cols-1 md:grid-cols-12 gap-4 px-6 py-5 hover:bg-gray-50 transition-colors items-center"
                >
                  <div className="col-span-2 font-mono text-sm text-gray-700">{row.id}</div>
                  <div className="col-span-4">
                    <div className="font-medium text-gray-900">{row.formTitle}</div>
                    {row.formSlug && (
                      <div className="text-sm text-gray-500">{row.formSlug}</div>
                    )}
                  </div>
                  <div className="col-span-3 text-sm text-gray-600">
                    {formatDate(row.lastUpdated)}
                  </div>
                  <div className="col-span-3 flex justify-end gap-2">
                    <Link
                      href={`/forms/custom-wizard/new?id=${row.id}&step=${row.currentStep ?? 0}`}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors text-sm"
                    >
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => handleDelete(row.id)}
                      disabled={deletingId === row.id}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition-colors text-sm disabled:opacity-50"
                    >
                      {deletingId === row.id ? 'Deleting…' : 'Delete'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
