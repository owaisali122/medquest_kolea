import { notFound } from 'next/navigation'
import { getFormBySlug } from '@/lib/forms'
import FormIORender from '@/app/components/FormIORender'
import { FormContainer } from '@/app/components/forms/FormContainer'
import { FormHeader } from '@/app/components/forms/FormHeader'
import { FormBody } from '@/app/components/forms/FormBody'

export async function generateMetadata() {
  const form = await getFormBySlug('contact-us')
  
  return {
    title: form?.title || 'Contact Us',
    description: form?.description || 'Contact us form',
  }
}

export default async function ContactUsPage() {
  const form = await getFormBySlug('contact-us')

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
