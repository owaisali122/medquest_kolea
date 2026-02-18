import { notFound } from 'next/navigation'
import { getFormBySlug } from '@/lib/forms'
import { FormContainer } from '@/app/components/forms/FormContainer'
import { FormHeader } from '@/app/components/forms/FormHeader'
import { FormBody } from '@/app/components/forms/FormBody'
import PanelFormWrapper from '../PanelFormWrapper'

 
export async function generateMetadata() {
  const form = await getFormBySlug('panel-form')
  return {
    title: form?.title || 'New Panel Application',
    description: form?.description || 'Create a new panel application form',
  }
}

export default async function NewPanelFormPage() {
  const form = await getFormBySlug('panel-form')
  if (!form) notFound()

  return (
    <PanelFormWrapper
      formSchema={form.schema}
      formId={form.id}
      recordId={undefined}
      initialStep={1}
    />
  )
}
