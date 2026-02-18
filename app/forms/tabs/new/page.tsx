import { notFound } from 'next/navigation'
import { getFormBySlug } from '@/lib/forms'
import { FormContainer } from '@/app/components/forms/FormContainer'
import { FormHeader } from '@/app/components/forms/FormHeader'
import { FormBody } from '@/app/components/forms/FormBody'
import { TabsButtonsWrapper } from '../TabsButtonsWrapper'

export async function generateMetadata() {
  const form = await getFormBySlug('tabs')
  
  return {
    title: form?.title || 'New Tabs Form',
    description: form?.description || 'FormIO tabs layout form',
  }
}

export default async function NewTabsPage() {
  const form = await getFormBySlug('tabs')

  if (!form) {
    notFound()
  }

  return (
    <FormContainer>
      <FormHeader title={form.title} description={form.description} />
      <FormBody>
        <TabsButtonsWrapper
          formSchema={form.schema}
          formId={form.id}
          submitButtonText={form.settings?.submitButtonText || 'Submit'}
        />
      </FormBody>
    </FormContainer>
  )
}
