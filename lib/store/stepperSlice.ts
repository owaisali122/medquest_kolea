'use client'

import { createSlice, PayloadAction } from '@reduxjs/toolkit'

export interface StepperState {
  // Current step index
  currentStep: number
  // Total number of steps
  totalSteps: number
  // All form data accumulated across steps
  formData: Record<string, any>
  // Record ID from database (null for new records)
  recordId: number | null
  // Loading states
  isLoading: boolean
  isSaving: boolean
  // Whether data has been modified since last save
  isDirty: boolean
  // Last saved timestamp
  lastSavedAt: string | null
}

const initialState: StepperState = {
  currentStep: 0,
  totalSteps: 0,
  formData: {},
  recordId: null,
  isLoading: false,
  isSaving: false,
  isDirty: false,
  lastSavedAt: null,
}

export const stepperSlice = createSlice({
  name: 'stepper',
  initialState,
  reducers: {
    // Set the total number of steps
    setTotalSteps: (state, action: PayloadAction<number>) => {
      state.totalSteps = action.payload
    },

    // Set the current step
    setCurrentStep: (state, action: PayloadAction<number>) => {
      state.currentStep = action.payload
    },

    // Go to next step
    nextStep: (state) => {
      if (state.currentStep < state.totalSteps - 1) {
        state.currentStep += 1
      }
    },

    // Go to previous step
    previousStep: (state) => {
      if (state.currentStep > 0) {
        state.currentStep -= 1
      }
    },

    // Go to a specific step
    goToStep: (state, action: PayloadAction<number>) => {
      const step = action.payload
      if (step >= 0 && step < state.totalSteps) {
        state.currentStep = step
      }
    },

    // Update form data (merge with existing data)
    updateFormData: (state, action: PayloadAction<Record<string, any>>) => {
      state.formData = { ...state.formData, ...action.payload }
      state.isDirty = true
    },

    // Set form data (replace all data)
    setFormData: (state, action: PayloadAction<Record<string, any>>) => {
      state.formData = action.payload
      state.isDirty = false
    },

    // Clear a specific field
    clearField: (state, action: PayloadAction<string>) => {
      delete state.formData[action.payload]
      state.isDirty = true
    },

    // Set record ID (from URL or after first save)
    setRecordId: (state, action: PayloadAction<number | null>) => {
      state.recordId = action.payload
    },

    // Set loading state
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload
    },

    // Set saving state
    setSaving: (state, action: PayloadAction<boolean>) => {
      state.isSaving = action.payload
    },

    // Mark data as saved
    markSaved: (state) => {
      state.isDirty = false
      state.lastSavedAt = new Date().toISOString()
    },

    // Reset the entire stepper state
    resetStepper: () => initialState,

    // Initialize stepper with data from API
    initializeStepper: (
      state,
      action: PayloadAction<{
        currentStep?: number
        totalSteps: number
        formData?: Record<string, any>
        recordId?: number | null
      }>
    ) => {
      const { currentStep, totalSteps, formData, recordId } = action.payload
      state.totalSteps = totalSteps
      if (currentStep !== undefined) {
        state.currentStep = currentStep
      }
      if (formData) {
        state.formData = formData
      }
      if (recordId !== undefined) {
        state.recordId = recordId
      }
      state.isLoading = false
      state.isDirty = false
    },
  },
})

export const {
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
} = stepperSlice.actions

export default stepperSlice.reducer
