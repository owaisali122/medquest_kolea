import { notFound } from 'next/navigation'
import { getFormsBySlugs } from '@/lib/forms'
import { StepperForm } from '@/app/components/stepper/StepperForm'
import { FormContainer } from '@/app/components/forms/FormContainer'

export async function generateMetadata() {
  return {
    title: 'Stepper Form',
    description: 'Multi-step form wizard',
  }
}

export default async function StepperFormPage() {
  // Define which forms to use for each step
  // You can customize these slugs based on your needs
  const formSlugs = ['contact-us', 'user-registration', 'employee-feedback']
  
  const forms = await getFormsBySlugs(formSlugs)

  if (forms.length === 0) {
    notFound()
  }

  return (
    <FormContainer>
      <div className="px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Multi-Step Form
          </h1>
          <p className="text-gray-600">
            Complete all steps to submit your information
          </p>
        </div>
        
        <StepperForm 
          forms={forms}
          onSubmitUrl="/api/forms/submit"
        />
      </div>
    </FormContainer>
  )
}
