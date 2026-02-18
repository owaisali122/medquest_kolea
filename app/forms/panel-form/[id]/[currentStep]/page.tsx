'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import PanelFormWrapper from '../../PanelFormWrapper'

export default function EditPanelPage() {

  const params = useParams()
  const id = params?.id as string
  const currentStep = params?.currentStep as string

  const [formSchema, setFormSchema] = useState<any>(null)
  const [formId, setFormId] = useState<number | null>(null)
  const [initialData, setInitialData] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {

    if (!id) return

    const load = async () => {
      try {

        // 🔥 1️⃣ Fetch form schema
        const formRes = await fetch(
          `/api/forms/get-by-slug?slug=panel-form`
        )

        if (!formRes.ok) throw new Error('Failed to load form')

        const form = await formRes.json()

        setFormSchema(form?.schema)
        setFormId(form?.id)

        // 🔥 2️⃣ Fetch record data
        const recordRes = await fetch(
          `/api/forms/get-session-state?recordId=${id}`
        )

        if (recordRes.ok) {
          const record = await recordRes.json()
          setInitialData(record?.data || {})
        }

      } catch (err) {
        console.error(err)
      } finally {
        setLoading(false)
      }
    }

    load()

  }, [id])

  if (loading || !formSchema) return null

  return (
    <PanelFormWrapper
      formSchema={formSchema}
      formId={formId}
      recordId={id}
      initialStep={parseInt(currentStep || '1', 10)}
      initialData={initialData}
    />
  )
}
