import { notFound } from 'next/navigation'
import { getFormBySlug } from '@/lib/forms'
import { SimpleStepperForm } from '@/app/components/stepper/SimpleStepperForm'

export async function generateMetadata() {
  return {
    title: 'Simple Stepper Form',
    description: 'Multi-step form wizard with dynamic forms',
  }
}

interface SimpleStepperPageProps {
  searchParams: Promise<{ step?: string; id?: string }>
}

export default async function SimpleStepperPage({ searchParams }: SimpleStepperPageProps) {
  const params = await searchParams
  
  const initialStep = params.step ? parseInt(params.step, 10) : 0

  // Load forms from database for each step
  const personalInformationForm = await getFormBySlug('personal-information')
  const contactDetailForm = await getFormBySlug('contact-detail')
  const dhsCommitmentForm = await getFormBySlug('dhs-application-counselor-commitment')

  const steps = [
    {
      id: 'applicant-details',
      title: personalInformationForm?.title || 'Applicant Details',
      description: personalInformationForm?.description || 'Personal information and contact details',
      form: personalInformationForm,
    },
    {
      id: 'contact-details',
      title: contactDetailForm?.title || 'Contact Details',
      description: contactDetailForm?.description || 'Address and communication information',
      form: contactDetailForm,
    },
    {
      id: 'dhs-commitment',
      title: dhsCommitmentForm?.title || 'DHS Application Counselor Commitment',
      description: dhsCommitmentForm?.description || 'Counselor commitment and agreement',
      form: dhsCommitmentForm,
    },
    {
      id: 'training-result',
      title: 'Training Result',
      description: 'Training completion and results',
      form: null,
    },
    {
      id: 'review-information',
      title: 'Review Information',
      description: 'Review and confirm all information',
      form: null,
    },
  ]

  if (!personalInformationForm) {
    notFound()
  }

  return (
    <SimpleStepperForm steps={steps} initialStep={initialStep} />
  )
}
