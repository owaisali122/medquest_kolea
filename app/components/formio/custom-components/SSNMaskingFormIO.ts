/**
 * SSN Masking FormIO Component
 * 
 * A custom FormIO component for SSN input with:
 * - Automatic formatting (XXX-XX-XXXX)
 * - Masking display (***-**-XXXX)
 * - Toggle visibility (eye icon)
 * - Copy prevention
 * 
 * All properties come from the FormIO component schema (from database):
 * - enableMasking: boolean - Enable/disable masking
 * - showToggle: boolean - Show/hide toggle button
 * - preventCopy: boolean - Prevent copy/paste of SSN
 */

export function createSSNMaskingClass(TextFieldComponent: any) {
  class SSNMaskingFormIO extends TextFieldComponent {
    // Instance properties
    rawValue: string = ''
    isHidden: boolean = true
    wrapper: HTMLDivElement | null = null
    toggleBtn: HTMLButtonElement | null = null
    inputElement: HTMLInputElement | null = null

    static schema(...extend: any[]) {
      // Only set type - all other properties come from DB
      return TextFieldComponent.schema({
        type: 'ssnMasking',
      }, ...extend)
    }

    static get builderInfo() {
      return {
        title: 'SSN Masking',
        group: 'basic',
        icon: 'id-card',
        weight: 35,
        schema: SSNMaskingFormIO.schema(),
      }
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      // Skip FormIO's built-in inputMask validation; this component uses its own masking/formatting
      this.skipMaskValidation = true

      // Load initial value from data
      const key = component.key
      if (data && key && data[key]) {
        this.rawValue = String(data[key]).replace(/\D/g, '').substring(0, 9)
      }
      
      console.log('SSNMaskingFormIO constructor:', {
        key: component.key,
        label: component.label,
        enableMasking: this.getEnableMasking(),
        showToggle: this.getShowToggle(),
        preventCopy: this.getPreventCopy(),
        initialValue: this.rawValue ? '***' : '(empty)'
      })
    }

    // Read properties from component schema (from database)
    getEnableMasking(): boolean {
      // Default to true if not specified in DB
      return this.component?.enableMasking !== false
    }

    getShowToggle(): boolean {
      // Default to true if not specified in DB
      return this.component?.showToggle !== false
    }

    getPreventCopy(): boolean {
      // Default to true if not specified in DB
      return this.component?.preventCopy !== false
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      
      // Apply styles
      this.applyStyles()
      
      // Setup SSN masking after the element is attached
      setTimeout(() => {
        this.fixDescriptionDisplay()
        this.setupSSNMasking()
      }, 100)
      
      return result
    }

    fixDescriptionDisplay() {
      if (!this.element) return
      const descEl = this.element.querySelector('.form-text, .text-muted')
      if (descEl && descEl.textContent?.includes('[object Object]')) {
        const desc = this.component?.description
        if (typeof desc === 'object' && desc !== null) {
          descEl.textContent = (desc as any).text || (desc as any).value || ''
        } else {
          (descEl as HTMLElement).style.display = 'none'
        }
      }
    }

    setupSSNMasking() {
      if (!this.element) {
        console.warn('SSNMaskingFormIO: element not found')
        return
      }
      
      const input = this.element.querySelector('input') as HTMLInputElement
      if (!input) {
        console.warn('SSNMaskingFormIO: input element not found')
        return
      }
      
      this.inputElement = input
      
      console.log('SSNMaskingFormIO: Setting up SSN masking for', this.component.key)
      
      // Basic input setup - use placeholder from DB or default
      input.placeholder = this.component.placeholder || 'XXX-XX-XXXX'
      input.maxLength = 11
      input.autocomplete = 'off'
      input.setAttribute('inputmode', 'numeric')

      // Check if wrapper already exists (prevent double setup)
      if (input.parentElement?.classList.contains('ssn-masking-wrapper')) {
        console.log('SSNMaskingFormIO: Wrapper already exists, skipping setup')
        return
      }

      // Create wrapper for toggle button
      this.wrapper = document.createElement('div')
      this.wrapper.className = 'ssn-masking-wrapper'
      input.parentNode?.insertBefore(this.wrapper, input)
      this.wrapper.appendChild(input)
      
      // Create hidden input to store raw value for form data collection
      // This ensures stepper forms and FormIO always get the raw value, not masked display
      const hiddenInput = document.createElement('input')
      hiddenInput.type = 'hidden'
      hiddenInput.name = input.name || this.component.key
      hiddenInput.className = 'ssn-masking-hidden-value'
      hiddenInput.setAttribute('data-key', this.component.key)
      hiddenInput.value = this.rawValue
      this.wrapper.appendChild(hiddenInput)

      // Add toggle button if enabled (from DB)
      if (this.getShowToggle()) {
        this.toggleBtn = document.createElement('button')
        this.toggleBtn.type = 'button'
        this.toggleBtn.className = 'ssn-toggle-btn'
        this.toggleBtn.innerHTML = this.isHidden ? '👁️' : '🙈'
        this.toggleBtn.title = this.isHidden ? 'Show SSN' : 'Hide SSN'
        this.toggleBtn.setAttribute('aria-label', this.isHidden ? 'Show SSN' : 'Hide SSN')
        this.wrapper.appendChild(this.toggleBtn)
        
        // Toggle button click handler
        this.toggleBtn.addEventListener('click', (e) => {
          e.preventDefault()
          e.stopPropagation()
          this.toggleVisibility()
        })
        
        // Add padding for toggle button
        input.style.paddingRight = '40px'
      }

      // Input event - format as user types
      input.addEventListener('input', (e) => {
        this.handleInput(e)
      })

      // Blur event - show masked value when not focused
      // IMPORTANT: Always ensure FormIO data model has raw value, not masked display
      input.addEventListener('blur', () => {
        // Ensure raw value is stored in FormIO data model before masking display
        this.updateComponentValue()
        
        if (this.getEnableMasking() && this.isHidden && this.rawValue.length > 0) {
          input.value = this.getMaskedDisplay()
        }
      })

      // Focus event - show actual value when focused
      input.addEventListener('focus', () => {
        if (this.rawValue.length > 0) {
          input.value = this.formatSSN(this.rawValue)
        }
      })

      // Paste event
      input.addEventListener('paste', (e) => {
        this.handlePaste(e)
      })

      // Prevent copy if enabled (from DB)
      if (this.getPreventCopy()) {
        input.addEventListener('copy', (e) => {
          e.preventDefault()
          console.log('SSNMaskingFormIO: Copy prevented')
        })
        
        input.addEventListener('cut', (e) => {
          e.preventDefault()
          console.log('SSNMaskingFormIO: Cut prevented')
        })
        
        // Prevent drag to copy
        input.addEventListener('dragstart', (e) => {
          e.preventDefault()
        })
        
        // Prevent context menu (right-click copy)
        input.addEventListener('contextmenu', (e) => {
          e.preventDefault()
        })
      }

      // Load existing value - extract raw digits and ensure data model has raw value
      const existingValue = this.dataValue
      if (existingValue) {
        // Extract digits only, in case value was stored with masking
        const digits = String(existingValue).replace(/\D/g, '').substring(0, 9)
        this.rawValue = digits
        
        // Ensure FormIO data model has raw value, not masked
        this.updateComponentValue()
        
        // Update hidden input with raw value
        const hiddenInput = this.wrapper?.querySelector('.ssn-masking-hidden-value') as HTMLInputElement
        if (hiddenInput) {
          hiddenInput.value = digits
        }
        
        // Display masked or formatted based on visibility state
        if (this.getEnableMasking() && this.isHidden && digits.length > 0) {
          input.value = this.getMaskedDisplay()
        } else {
          input.value = this.formatSSN(this.rawValue)
        }
      }
      
      console.log('SSNMaskingFormIO: Setup complete for', this.component.key)
    }

    handleInput(e: Event) {
      const target = e.target as HTMLInputElement
      const cursorPos = target.selectionStart || 0
      
      // Extract only digits
      const digits = target.value.replace(/\D/g, '').substring(0, 9)
      this.rawValue = digits
      
      // Format the value
      const formatted = this.formatSSN(digits)
      target.value = formatted
      
      // Adjust cursor position for dashes
      let newCursorPos = cursorPos
      if (digits.length > 3 && cursorPos > 3) newCursorPos++
      if (digits.length > 5 && cursorPos > 6) newCursorPos++
      target.setSelectionRange(
        Math.min(newCursorPos, formatted.length), 
        Math.min(newCursorPos, formatted.length)
      )

      // Update FormIO value and hidden input
      this.updateComponentValue()
    }

    handlePaste(e: ClipboardEvent) {
      e.preventDefault()
      
      const pastedText = e.clipboardData?.getData('text') || ''
      const digits = pastedText.replace(/\D/g, '').substring(0, 9)
      this.rawValue = digits
      
      if (this.inputElement) {
        this.inputElement.value = this.formatSSN(digits)
      }
      
      // Update FormIO value and hidden input
      this.updateComponentValue()
    }

    toggleVisibility() {
      this.isHidden = !this.isHidden
      
      if (this.toggleBtn) {
        this.toggleBtn.innerHTML = this.isHidden ? '👁️' : '🙈'
        this.toggleBtn.title = this.isHidden ? 'Show SSN' : 'Hide SSN'
        this.toggleBtn.setAttribute('aria-label', this.isHidden ? 'Show SSN' : 'Hide SSN')
      }
      
      if (this.inputElement && this.rawValue.length > 0) {
        // Only update if input is not focused
        if (document.activeElement !== this.inputElement) {
          if (this.getEnableMasking() && this.isHidden) {
            this.inputElement.value = this.getMaskedDisplay()
          } else {
            this.inputElement.value = this.formatSSN(this.rawValue)
          }
        }
      }
    }

    formatSSN(digits: string): string {
      if (!digits) return ''
      digits = digits.replace(/\D/g, '').substring(0, 9)
      
      if (digits.length <= 3) {
        return digits
      } else if (digits.length <= 5) {
        return `${digits.substring(0, 3)}-${digits.substring(3)}`
      } else {
        return `${digits.substring(0, 3)}-${digits.substring(3, 5)}-${digits.substring(5)}`
      }
    }

    getMaskedDisplay(): string {
      if (!this.rawValue || !this.getEnableMasking()) {
        return this.formatSSN(this.rawValue)
      }
      
      const len = this.rawValue.length
      
      // Show only last 4 digits
      if (len <= 4) {
        return '*'.repeat(len)
      } else if (len <= 5) {
        return `***-${this.rawValue.substring(3)}`
      } else {
        return `***-**-${this.rawValue.substring(5)}`
      }
    }

    updateComponentValue() {
      // Update FormIO data model - ALWAYS store raw value (digits only)
      const key = this.component.key
      const valueToStore = this.rawValue // Always store raw digits, never masked display
      
      if (this.data && key) {
        this.data[key] = valueToStore
      }
      // Only write to root when at root level (not inside editgrid/datagrid row)
      if (this.root?.data && key && this.data === this.root.data) {
        this.root.data[key] = valueToStore
      }
      
      // Also update the component's internal value storage
      super.dataValue = valueToStore
      
      // Update hidden input field (for stepper forms that read from DOM)
      if (this.wrapper) {
        const hiddenInput = this.wrapper.querySelector('.ssn-masking-hidden-value') as HTMLInputElement
        if (hiddenInput) {
          hiddenInput.value = valueToStore
        }
      }
      
      // Trigger FormIO change event
      this.triggerChange()
      
      console.log(`SSNMaskingFormIO: Updated value for ${key}`, {
        rawValue: this.rawValue,
        storedValue: valueToStore,
        displayValue: this.inputElement?.value
      })
    }

    // Get current value - ALWAYS return raw value for FormIO submission
    getValue() {
      // Ensure we always return raw digits, never masked display
      const rawValue = this.rawValue || ''
      console.log(`SSNMaskingFormIO: getValue() called for ${this.component.key}, returning rawValue: ${rawValue}`)
      return rawValue
    }

    // Set value (called by FormIO when loading data)
    setValue(value: any, flags?: any) {
      if (value === undefined) return
      
      const newValue = value ? String(value).replace(/\D/g, '').substring(0, 9) : ''
      this.rawValue = newValue
      
      // Update hidden input with raw value
      if (this.wrapper) {
        const hiddenInput = this.wrapper.querySelector('.ssn-masking-hidden-value') as HTMLInputElement
        if (hiddenInput) {
          hiddenInput.value = newValue
        }
      }
      
      // Update input display
      if (this.inputElement) {
        if (this.getEnableMasking() && this.isHidden && document.activeElement !== this.inputElement) {
          this.inputElement.value = this.getMaskedDisplay()
        } else {
          this.inputElement.value = this.formatSSN(this.rawValue)
        }
      }
      
      return super.setValue(this.rawValue, flags)
    }

    // Value used by FormIO validators. When the form has inputMask/displayMask (e.g. 999-99-9999)
    // or pattern/length expecting XXX-XX-XXXX, return formatted value so validation passes.
    // We still store and submit raw digits via dataValue/getValue.
    get validationValue() {
      const raw = this.rawValue || ''
      if (raw.length !== 9) return raw
      const comp = this.component || {}
      const inputMask = String(comp.inputMask || '')
      const displayMask = String(comp.displayMask || '')
      const hasSSNMask = /9{2,3}[-\s]*9{2}[-\s]*9{4}/.test(inputMask) || /9{2,3}[-\s]*9{2}[-\s]*9{4}/.test(displayMask) ||
        inputMask === '999-99-9999' || displayMask === '999-99-9999'
      const validate = comp.validate || {}
      const pattern = String(validate.pattern || '')
      const minLen = parseInt(validate.minLength, 10)
      const maxLen = parseInt(validate.maxLength, 10)
      const expectsFormattedLength = minLen === 11 || maxLen === 11
      const looksLikeSSNPattern = pattern.length > 0 &&
        pattern.includes('{3}') && pattern.includes('{2}') && pattern.includes('{4}') &&
        (pattern.includes('-') || /[d0-9\\\[\]]/.test(pattern))
      if (hasSSNMask || looksLikeSSNPattern || expectsFormattedLength) {
        return this.formatSSN(raw)
      }
      return raw
    }

    // Get the value for submission - ALWAYS return raw value (digits only), never masked display
    get dataValue() {
      // Always return the raw value (digits only), never the masked display
      const rawValue = this.rawValue || ''
      
      // If super.dataValue exists but is masked (contains asterisks), ignore it and use rawValue
      const superValue = super.dataValue
      if (superValue && typeof superValue === 'string' && superValue.includes('*')) {
        console.warn(`SSNMaskingFormIO: Detected masked value in super.dataValue, using rawValue instead: ${rawValue}`)
        return rawValue
      }
      
      return rawValue || superValue || ''
    }

    // Set the value from submission
    set dataValue(value: any) {
      if (value) {
        // Extract digits only, ignore any masked format
        const digits = String(value).replace(/\D/g, '').substring(0, 9)
        this.rawValue = digits
      } else {
        this.rawValue = ''
      }
      // Always store raw value in parent
      super.dataValue = this.rawValue
    }

    // Cleanup
    destroy() {
      this.wrapper = null
      this.toggleBtn = null
      this.inputElement = null
      super.destroy()
    }

    // Apply component styles
    applyStyles() {
      const styleId = 'ssn-masking-styles'
      if (document.getElementById(styleId)) return

      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .ssn-masking-wrapper {
          position: relative;
          width: 100%;
          display: inline-block;
        }
        
        .ssn-masking-wrapper input {
          width: 100%;
          box-sizing: border-box;
        }
        
        .ssn-toggle-btn {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          font-size: 16px;
          padding: 4px;
          color: #666;
          line-height: 1;
          transition: opacity 0.2s ease;
        }
        
        .ssn-toggle-btn:hover {
          opacity: 0.7;
        }
        
        .ssn-toggle-btn:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
          border-radius: 4px;
        }
        
        /* Prevent text selection when copy is disabled */
        .ssn-masking-wrapper input[data-prevent-copy="true"] {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `
      document.head.appendChild(style)
    }
  }

  return SSNMaskingFormIO
}

export default createSSNMaskingClass
