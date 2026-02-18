import { notFound } from 'next/navigation'
import { getFormBySlug } from '@/lib/forms'
import { FormContainer } from '@/app/components/forms/FormContainer'
import { FormHeader } from '@/app/components/forms/FormHeader'
import { FormBody } from '@/app/components/forms/FormBody'
import { TabApplicationFormWrapper } from '../TabApplicationFormWrapper'

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return {
    title: `Edit Tab Application #${id}`,
    description: 'Continue editing your tab application form',
  }
}

interface EditTabApplicationPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ currentTab?: string }>
}

export default async function EditTabApplicationPage({ params, searchParams }: EditTabApplicationPageProps) {
  const { id } = await params
  const { currentTab } = await searchParams

  const form = await getFormBySlug('tab-application')

  if (!form) {
    notFound()
  }

  const initialTab = currentTab !== undefined && currentTab !== '' ? parseInt(currentTab, 10) : 0

  return (
    <FormContainer>
      <FormHeader
        title={`${form.title} - Edit`}
        description={`Continue editing your form (Record #${id})`}
      />
      <FormBody>
        <TabApplicationFormWrapper
          formSchema={form.schema}
          formId={form.id}
          submitButtonText={form.settings?.submitButtonText || 'Submit'}
          recordId={id}
          initialTab={initialTab}
        />
      </FormBody>
    </FormContainer>
  )
}
