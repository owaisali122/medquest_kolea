'use client'

import { useRef } from 'react'
import { Wizard, useWizard } from 'react-use-wizard'
import FormIORenderWizardLegacy from './FormIORenderWizardLegacy'

export interface WizardStepForm {
  id: number
  schema: any
}

export interface CustomWizardStepConfig {
  id: string
  title: string
  description?: string
  form: WizardStepForm
}

export interface CustomWizardFormProps {
  steps: CustomWizardStepConfig[]
  startIndex?: number
  getInitialDataForStep?: (stepIndex: number, formId: number) => Record<string, unknown>
  onNext?: (stepIndex: number, stepData: Record<string, unknown>) => void | Promise<void>
  onBeforePrevious?: (stepIndex: number, getCurrentData: () => Record<string, unknown>) => void
  onSaveExit?: (stepIndex: number, stepData: Record<string, unknown>) => void | Promise<void>
  onSubmit?: () => void | Promise<void>
  onStepChange?: (stepIndex: number) => void
}


function WizardStep({
  stepIndex,
  stepConfig,
  stepCount,
  getInitialDataForStep,
  formInstanceRef,
  onNext,
  onSubmit,
  isLastStep,
}: {
  stepIndex: number
  stepConfig: CustomWizardStepConfig
  stepCount: number
  getInitialDataForStep?: (stepIndex: number, formId: number) => Record<string, unknown>
  formInstanceRef: React.RefObject<any>
  onNext?: (stepIndex: number, stepData: Record<string, unknown>) => void | Promise<void>
  onSubmit?: () => void | Promise<void>
  isLastStep: boolean
}) {
  const { activeStep, nextStep } = useWizard()

  const stepKey = `step-${stepIndex}-${stepConfig.form.id}-${activeStep}`

  const handleValidSubmit = async (data: Record<string, unknown>) => {
    if (isLastStep) {
      await onNext?.(activeStep, data)
      await onSubmit?.()
    } else {
      await onNext?.(activeStep, data)
      nextStep()
    }
  }

  return (
    <>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{stepConfig.title}</h1>
        {stepConfig.description && <p className="text-gray-600 mt-1">{stepConfig.description}</p>}
      </div>
      <div className="bg-white rounded-lg border border-gray-200 p-6 min-h-[300px]">
        <div className={`wizard-step-${stepConfig.form.id}`}>
          <style
            dangerouslySetInnerHTML={{
              __html: `
                .wizard-step-${stepConfig.form.id} button[type="submit"],
                .wizard-step-${stepConfig.form.id} button[data-action="submit"],
                .wizard-step-${stepConfig.form.id} button[data-action="cancel"],
                .wizard-step-${stepConfig.form.id} .formio-actions button[type="submit"],
                .wizard-step-${stepConfig.form.id} .formio-actions button[data-action="cancel"] { display: none !important; }
              `,
            }}
          />
          <FormIORenderWizardLegacy
            key={stepKey}
            formSchema={stepConfig.form.schema}
            formId={stepConfig.form.id}
            initialData={getInitialDataForStep?.(stepIndex, stepConfig.form.id)}
            onFormReady={(instance) => { formInstanceRef.current = instance }}
            onValidSubmit={handleValidSubmit}
          />
        </div>
      </div>
    </>
  )
}

function WizardFooter({
  steps,
  formInstanceRef,
  onBeforePrevious,
  onSaveExit,
  onSubmit,
}: {
  steps: CustomWizardStepConfig[]
  formInstanceRef: React.RefObject<any>
  onBeforePrevious?: (stepIndex: number, getCurrentData: () => Record<string, unknown>) => void
  onSaveExit?: (stepIndex: number, stepData: Record<string, unknown>) => void | Promise<void>
  onSubmit?: () => void | Promise<void>
}) {
  const { activeStep, isFirstStep, isLastStep, isLoading, previousStep, nextStep } = useWizard()

  const getCurrentData = () => {
    const form = formInstanceRef.current
    const data = form?.submission?.data ?? {}
    const { submit, cancel, ...rest } = data
    return rest as Record<string, unknown>
  }

  const handleSaveExit = async () => {
    const data = getCurrentData()
    await onSaveExit?.(activeStep, data)
  }

  const handlePrevious = () => {
    onBeforePrevious?.(activeStep, getCurrentData)
    previousStep()
  }

  return (
    <div className="flex justify-between items-center pt-6 border-t border-gray-200 mt-6">
      <button
        type="button"
        onClick={handleSaveExit}
        disabled={isLoading}
        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50"
      >
        Save & Exit
      </button>
      <div className="flex gap-3">
        {!isFirstStep && (
          <button
            type="button"
            onClick={handlePrevious}
            disabled={isLoading}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 disabled:opacity-50"
          >
            Previous
          </button>
        )}
        {isLastStep ? (
          <button
            type="button"
            onClick={() => formInstanceRef.current?.submit()?.catch?.((err: unknown) => {
              if (err instanceof Error && typeof err.message === 'string') throw err
              console.warn(typeof err === 'string' ? err : 'Submission failed')
            })}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Submit
          </button>
        ) : (
          <button
            type="button"
            onClick={() => formInstanceRef.current?.submit()?.catch?.((err: unknown) => {
              if (err instanceof Error && typeof err.message === 'string') throw err
              console.warn(typeof err === 'string' ? err : 'Submission failed')
            })}
            disabled={isLoading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            Next
          </button>
        )}
      </div>
    </div>
  )
}

function WizardLayout({ 
  children,
  steps,
  formInstanceRef,
  onBeforePrevious,
  onSaveExit,
  onSubmit,
}: { 
  children?: React.ReactNode
  steps: CustomWizardStepConfig[]
  formInstanceRef: React.RefObject<any>
  onBeforePrevious?: (stepIndex: number, getCurrentData: () => Record<string, unknown>) => void
  onSaveExit?: (stepIndex: number, stepData: Record<string, unknown>) => void | Promise<void>
  onSubmit?: () => void | Promise<void>
}) {
  const { activeStep, goToStep } = useWizard()

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <div className="w-64 bg-white border-r border-gray-200 p-6">
        <nav className="space-y-2">
          {steps.map((step, index) => {
            const isActive = index === activeStep
            const isAllowed = index <= activeStep
            
            return (
              <button
                key={step.id}
                type="button"
                onClick={() => isAllowed && goToStep(index)}
                disabled={!isAllowed}
                className={`w-full text-left px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-green-50 text-green-700 font-medium'
                    : isAllowed
                    ? 'text-gray-700 hover:bg-gray-50 cursor-pointer'
                    : 'text-gray-400 cursor-not-allowed'
                }`}
              >
                {step.title}
              </button>
            )
          })}
        </nav>
      </div>
      <div className="flex-1 flex flex-col">
        <div className="flex-1 py-8 px-6">
          <div className="max-w-4xl mx-auto">
            {children}
          </div>
        </div>
        <div className="px-6 pb-6">
          <WizardFooter
            steps={steps}
            formInstanceRef={formInstanceRef}
            onBeforePrevious={onBeforePrevious}
            onSaveExit={onSaveExit}
            onSubmit={onSubmit}
          />
        </div>
      </div>
    </div>
  )
}

export function CustomWizardForm({
  steps,
  startIndex = 0,
  getInitialDataForStep,
  onNext,
  onBeforePrevious,
  onSaveExit,
  onSubmit,
  onStepChange,
}: CustomWizardFormProps) {
  const formInstanceRef = useRef<any>(null)
  const safeSteps = Array.isArray(steps) ? steps : []

  return (
    <Wizard
      startIndex={startIndex}
      onStepChange={(i) => onStepChange?.(i)}
      wrapper={
        <WizardLayout
          steps={safeSteps}
          formInstanceRef={formInstanceRef}
          onBeforePrevious={onBeforePrevious}
          onSaveExit={onSaveExit}
          onSubmit={onSubmit}
        />
      }
    >
      {safeSteps.map((stepConfig, i) => (
        <WizardStep
          key={stepConfig.id}
          stepIndex={i}
          stepConfig={stepConfig}
          stepCount={safeSteps.length}
          getInitialDataForStep={getInitialDataForStep}
          formInstanceRef={formInstanceRef}
          onNext={onNext}
          onSubmit={onSubmit}
          isLastStep={i === safeSteps.length - 1}
        />
      ))}
    </Wizard>
  )
}
