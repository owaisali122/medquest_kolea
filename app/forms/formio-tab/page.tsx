import { notFound } from 'next/navigation'
import { getFormBySlug } from '@/lib/forms'
import { FormContainer } from '@/app/components/forms/FormContainer'
import { FormHeader } from '@/app/components/forms/FormHeader'
import { FormBody } from '@/app/components/forms/FormBody'
import { FormIOTabsWrapper } from './FormIOTabsWrapper'

export async function generateMetadata() {
  const form = await getFormBySlug('tabs')
  
  return {
    title: form?.title || 'Tabs Form',
    description: form?.description || 'FormIO tabs layout form',
  }
}

interface FormIOTabsPageProps {
  searchParams: {
    id?: string
    tab?: string
  }
}

export default async function FormIOTabsPage({ searchParams }: FormIOTabsPageProps) {
  const form = await getFormBySlug('tabs')

  if (!form) {
    notFound()
  }

  const recordId = searchParams.id ? parseInt(searchParams.id, 10) : null
  const initialTab = searchParams.tab ? parseInt(searchParams.tab, 10) : 0

  return (
    <FormContainer>
      <FormHeader title={form.title} description={form.description} />
      <FormBody>
        <FormIOTabsWrapper
          formSchema={form.schema}
          formId={form.id}
          submitButtonText={form.settings?.submitButtonText || 'Submit'}
          recordId={recordId}
          initialTab={initialTab}
        />
      </FormBody>
    </FormContainer>
  )
}
