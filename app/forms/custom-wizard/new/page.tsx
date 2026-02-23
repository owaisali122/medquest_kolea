import { notFound } from 'next/navigation'
import { getFormsBySlugs } from '@/lib/forms'
import { CustomWizardFormWrapper } from '../CustomWizardFormWrapper'

const WIZARD_SLUGS = [
  'custom-application-details',
  'custom-contact-details',
  'custom-dhs-application-counselor-commitment',
  'custom-training-results',
  'custom-review-information',
]

export async function generateMetadata() {
  return {
    title: 'Custom Wizard',
    description: 'Multi-step custom wizard',
  }
}

export default async function CustomWizardNewPage() {
  const forms = await getFormsBySlugs(WIZARD_SLUGS)
  if (!forms || forms.length !== WIZARD_SLUGS.length) notFound()

  const steps = forms.map((form) => ({
    id: form.slug,
    title: form.title,
    description: form.description,
    form: { id: form.id, schema: form.schema },
  }))

  return <CustomWizardFormWrapper steps={steps} />
}
