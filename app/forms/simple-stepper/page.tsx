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
  
  // Get initial step from URL parameter
  // If step is provided, use it; otherwise default to 0
  // This ensures the step from URL is always respected
  const initialStep = params.step ? parseInt(params.step, 10) : 0

  // Validate step is within bounds (will be handled client-side, but good to log)
  if (initialStep < 0) {
    console.warn('Invalid step parameter:', params.step, 'defaulting to 0')
  }
  
  // Note: ID parameter is used to track existing records in the database
  // If no ID is present, a new record will be created on first save
  // Load forms from database for each step
  const personalInformationForm = await getFormBySlug('personal-information')
  const contactDetailForm = await getFormBySlug('contact-detail')
  const dhsCommitmentForm = await getFormBySlug('dhs-application-counselor-commitment')

  const steps = [
    {
      id: 'applicant-details',
      title: personalInformationForm?.title || 'Applicant Details',
      description: personalInformationForm?.description || 'Personal information and contact details',
      form: personalInformationForm, // Load form from database
    },
    {
      id: 'contact-details',
      title: contactDetailForm?.title || 'Contact Details',
      description: contactDetailForm?.description || 'Address and communication information',
      form: contactDetailForm, // Load form from database
    },
    {
      id: 'dhs-commitment',
      title: dhsCommitmentForm?.title || 'DHS Application Counselor Commitment',
      description: dhsCommitmentForm?.description || 'Counselor commitment and agreement',
      form: dhsCommitmentForm, // Load form from database
    },
    {
      id: 'training-result',
      title: 'Training Result',
      description: 'Training completion and results',
      form: null, // Will be loaded later
    },
    {
      id: 'review-information',
      title: 'Review Information',
      description: 'Review and confirm all information',
      form: null, // Will be loaded later
    },
  ]

  // If the first step form is required and not found, show 404
  if (!personalInformationForm) {
    notFound()
  }

  return (
    <SimpleStepperForm steps={steps} initialStep={initialStep} />
  )
}
