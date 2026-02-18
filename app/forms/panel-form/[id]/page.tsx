'use client'

import { useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'

export default function PanelFormResumePage() {

  const router = useRouter()
  const params = useParams()
  const id = params?.id as string

  useEffect(() => {
    if (!id) return

    const load = async () => {
      try {
        const response = await fetch(
          `/api/forms/get-session-state?recordId=${id}`
        )

        if (!response.ok) {
          router.replace(`/forms/panel-form/${id}/1`)
          return
        }

        const state = await response.json()

        const step = state?.data?.currentStep
          ? Number(state.data.currentStep)
          : 1

        router.replace(`/forms/panel-form/${id}/${step}`)

      } catch {
        router.replace(`/forms/panel-form/${id}/1`)
      }
    }

    load()

  }, [id, router])

  return null
}
