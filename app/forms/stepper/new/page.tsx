import { notFound } from 'next/navigation'
import { getFormBySlug } from '@/lib/forms'
import { TabStepperForm } from '@/app/components/stepper/TabStepperForm'

export async function generateMetadata() {
  return {
    title: 'New Tab Stepper Form',
    description: 'Start a new multi-step tab-based form',
  }
}

export default async function NewTabStepperPage() {
  // Fetch forms for each step
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
      title: dhsCommitmentForm?.title || 'DHS Commitment',
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
      title: 'Review',
      description: 'Review and confirm all information',
      form: null,
    },
  ]

  if (!personalInformationForm) {
    notFound()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Page Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">New Application</h1>
          <p className="mt-1 text-gray-600">Complete all steps to submit your application</p>
        </div>
        
        <TabStepperForm steps={steps} initialStep={0} />
      </div>
    </div>
  )
}
