export { makeStore, type AppStore, type RootState, type AppDispatch } from './store'
export { useAppDispatch, useAppSelector, useAppStore } from './hooks'
export {
  stepperSlice,
  setTotalSteps,
  setCurrentStep,
  nextStep,
  previousStep,
  goToStep,
  updateFormData,
  setFormData,
  clearField,
  setRecordId,
  setLoading,
  setSaving,
  markSaved,
  resetStepper,
  initializeStepper,
  type StepperState,
} from './stepperSlice'
