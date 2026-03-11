/**
 * Custom FormIO Components Registry
 *
 * Registers all custom components with a given Formio instance.
 * Designed to be called once during app initialization; subsequent
 * calls are no-ops.
 */

import { createSearchableDropdownClass } from './SearchableDropdownFormIO'
import { createSSNMaskingClass } from './SSNMaskingFormIO'
import { createTabNavigationButtonsClass } from './TabNavigationButtonsFormIO'
import { createTabProgressClass } from './TabProgressFormIO'
import { createFieldReferenceClass } from './FieldReferenceFormIO'
import { createAppDetailRefClass } from './AppDetailRefFormIO'
import { createDocumentUploadClass } from './DocumentUploadFormIO'

let componentsRegistered = false

/**
 * Register a component class under one or more type names.
 * Handles the three registration APIs that different formiojs versions expose.
 */
function registerComponent(Formio: any, name: string, ComponentClass: any): void {
  if (typeof Formio.Components.setComponent === 'function') {
    Formio.Components.setComponent(name, ComponentClass)
  } else if (typeof Formio.Components.addComponent === 'function') {
    Formio.Components.addComponent(name, ComponentClass)
  } else {
    Formio.Components.components[name] = ComponentClass
  }
}

/**
 * Register all custom FormIO components.
 *
 * @param FormioInstance - Optional Formio reference. When omitted the function
 *   dynamically imports formiojs and resolves Formio itself (backward-compat).
 */
export async function registerCustomComponents(FormioInstance?: any): Promise<void> {
  if (componentsRegistered) return
  if (typeof window === 'undefined') return

  try {
    let Formio = FormioInstance

    if (!Formio) {
      const mod = await import('formiojs')
      Formio = (mod as any).Formio || (mod as any).default?.Formio || (mod as any).default
    }

    if (!Formio?.Components?.components) {
      console.warn('[formio-custom] Formio Components API not available')
      return
    }

    ;(window as any).Formio = Formio

    const FieldComponent = Formio.Components.components.field
    if (!FieldComponent) {
      console.warn('[formio-custom] FieldComponent not found')
      return
    }

    // --- Document Upload ---
    registerComponent(Formio, 'documentUpload', createDocumentUploadClass(FieldComponent))

    // --- SSN Masking (registered under both 'ssn' and 'ssnMasking' for compat) ---
    const TextFieldComponent = Formio.Components.components.textfield
    if (TextFieldComponent) {
      const SSNMasking = createSSNMaskingClass(TextFieldComponent)
      registerComponent(Formio, 'ssn', SSNMasking)
      registerComponent(Formio, 'ssnMasking', SSNMasking)
    }

    // --- Searchable Dropdown ---
    registerComponent(Formio, 'searchableDropdown', createSearchableDropdownClass(FieldComponent))

    // --- Tab Navigation Buttons ---
    registerComponent(Formio, 'tabnavigationbuttons', createTabNavigationButtonsClass(FieldComponent))

    // --- Tab Progress ---
    registerComponent(Formio, 'tabprogress', createTabProgressClass(FieldComponent))

    // --- Field Reference ---
    registerComponent(Formio, 'fieldReference', createFieldReferenceClass(FieldComponent))

    // --- App Detail Reference ---
    registerComponent(Formio, 'appDetailRef', createAppDetailRefClass(FieldComponent))

    componentsRegistered = true
  } catch (error) {
    console.error('[formio-custom] Registration failed:', error)
  }
}
