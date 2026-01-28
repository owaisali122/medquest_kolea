'use client'

import { configureStore } from '@reduxjs/toolkit'
import stepperReducer from './stepperSlice'

export const makeStore = () => {
  return configureStore({
    reducer: {
      stepper: stepperReducer,
    },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({
        serializableCheck: {
          // Ignore these paths in the state for serialization check
          ignoredPaths: ['stepper.formData'],
        },
      }),
  })
}

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore['getState']>
export type AppDispatch = AppStore['dispatch']
