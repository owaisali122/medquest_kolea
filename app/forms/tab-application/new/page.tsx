import { notFound } from 'next/navigation'
import { getFormBySlug } from '@/lib/forms'
import { FormContainer } from '@/app/components/forms/FormContainer'
import { FormHeader } from '@/app/components/forms/FormHeader'
import { FormBody } from '@/app/components/forms/FormBody'
import { TabApplicationFormWrapper } from '../TabApplicationFormWrapper'

export async function generateMetadata() {
  const form = await getFormBySlug('tab-application')
  return {
    title: form?.title || 'New Tab Application',
    description: form?.description || 'Create a new tab application form',
  }
}

export default async function NewTabApplicationPage() {
  const form = await getFormBySlug('tab-application')

  if (!form) {
    notFound()
  }

  return (
    <FormContainer>
      <FormHeader title={form.title} description={form.description} />
      <FormBody>
        <TabApplicationFormWrapper
          formSchema={form.schema}
          formId={form.id}
          submitButtonText={form.settings?.submitButtonText || 'Submit'}
        />
      </FormBody>
    </FormContainer>
  )
}
