import { notFound } from 'next/navigation'
import { getFormBySlug } from '@/lib/forms'
import FormIORender from '@/app/components/FormIORender'
import { FormContainer } from '@/app/components/forms/FormContainer'
import { FormHeader } from '@/app/components/forms/FormHeader'
import { FormBody } from '@/app/components/forms/FormBody'

export async function generateMetadata() {
  const form = await getFormBySlug('user-registration')
  
  return {
    title: form?.title || 'User Registration',
    description: form?.description || 'User registration form',
  }
}

export default async function UserRegistrationPage() {
  const form = await getFormBySlug('user-registration')

  if (!form) {
    notFound()
  }

  return (
    <FormContainer>
      <FormHeader title={form.title} description={form.description} />
      <FormBody>
        <FormIORender
          formSchema={form.schema}
          formId={form.id}
          submitButtonText={form.settings?.submitButtonText || 'Submit'}
        />
      </FormBody>
    </FormContainer>
  )
}
