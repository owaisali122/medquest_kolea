/**
 * FormIO wrapper for the React-based Searchable Dropdown Component
 * 
 * This bridges FormIO's vanilla JS component system with our React component.
 * It renders a placeholder element that React will mount into.
 */

import { createRoot, Root } from 'react-dom/client'
import React from 'react'

// API response item schema (must match SearchableDropdown.tsx)
interface ApiResponseItem {
  id: string
  value: string
  country: string
  city: string
}

// Import the React component dynamically to avoid SSR issues
let SearchableDropdownReact: React.ComponentType<any> | null = null

// Lazy load the React component
async function loadReactComponent() {
  if (!SearchableDropdownReact) {
    const module = await import('./SearchableDropdown')
    SearchableDropdownReact = module.SearchableDropdownReact
  }
  return SearchableDropdownReact
}

export function createSearchableDropdownClass(FieldComponent: any) {
  return class SearchableDropdownFormIO extends FieldComponent {
    // Instance properties
    private reactRoot: Root | null = null
    private reactContainer: any | null = null
    private currentValue: ApiResponseItem | ApiResponseItem[] | string | string[] | null = null
    private isMultiple: boolean = false
    private apiUrl: string = ''

    static schema(...extend: any[]) {
      return FieldComponent.schema({
        type: 'searchableDropdown',
        label: 'Searchable Dropdown',
        key: 'searchableDropdown',
        dataSrc: 'custom',
        multiple: false,
      }, ...extend)
    }

    static get builderInfo() {
      return {
        title: 'Searchable Dropdown',
        group: 'basic',
        icon: 'search',
        weight: 30,
        schema: SearchableDropdownFormIO.schema(),
      }
    }

    get defaultSchema() {
      return SearchableDropdownFormIO.schema()
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      
      // Read configuration
      let rawUrl = component.data?.url || ''
      if (rawUrl.includes('%7B') || rawUrl.includes('%7D') || rawUrl.includes('%24')) {
        try {
          rawUrl = decodeURIComponent(rawUrl)
        } catch {
          // Keep original
        }
      }
      
      this.apiUrl = rawUrl
      this.isMultiple = component.multiple ?? false
      this.currentValue = null
      
      // Load initial value from data
      const key = component.key
      if (data && key && data[key]) {
        this.currentValue = data[key]
      }
      
      console.log('SearchableDropdownFormIO constructor:', {
        key: component.key,
        apiUrl: this.apiUrl,
        isMultiple: this.isMultiple,
        initialValue: this.currentValue
      })
    }

    // Render the component
    render() {
      return super.render(`
        <div ref="searchableDropdownContainer" class="formio-searchable-dropdown" style="width: 100%; min-height: 38px;">
          <div class="searchable-dropdown-loading-placeholder" style="padding: 10px; color: #666;">
            Loading dropdown...
          </div>
        </div>
      `)
    }

    // Called when component is attached to DOM
    attach(element: HTMLElement) {
      const result = super.attach(element)
      
      // Find our container
      this.loadRefs(element, {
        searchableDropdownContainer: 'single'
      })
      
      const container = (this.refs as any)?.searchableDropdownContainer
      if (container) {
        this.mountReactComponent(container as HTMLElement)
      }
      
      // Try to load value from multiple sources after mount
      // The data might be set at different times by FormIO
      const loadTimes = [100, 200, 400, 700, 1000, 1500]
      loadTimes.forEach(delay => {
        setTimeout(() => {
          this.tryLoadInitialValue()
        }, delay)
      })
      
      return result
    }
    
    // Try to load initial value from various sources
    tryLoadInitialValue() {
      const key = this.component?.key
      if (!key) return
      
      // Skip if we already have a value
      if (this.currentValue && (
        (Array.isArray(this.currentValue) && this.currentValue.length > 0) ||
        (typeof this.currentValue === 'string' && this.currentValue.length > 0)
      )) {
        return // Already have value, skip
      }
      
      let value = null
      
      // Try this.data
      if (this.data && this.data[key]) {
        value = this.data[key]
        console.log('SearchableDropdownFormIO: Found value in this.data:', value)
      }
      
      // Try root.data
      if (!value && this.root?.data && this.root.data[key]) {
        value = this.root.data[key]
        console.log('SearchableDropdownFormIO: Found value in root.data:', value)
      }
      
      // Try root.submission.data
      if (!value && this.root?.submission?.data && this.root.submission.data[key]) {
        value = this.root.submission.data[key]
        console.log('SearchableDropdownFormIO: Found value in root.submission.data:', value)
      }
      
      // Try to find hidden input values (set by useFormIO's setDOMInputValues)
      // Look for all hidden inputs and find one with a non-empty value
      if (!value) {
        const formElement = this.element?.closest('form') || this.element?.closest('.formio-form') || document
        const hiddenInputs = formElement.querySelectorAll(`input.searchable-dropdown-hidden-value[name="${key}"]`)
        
        console.log(`SearchableDropdownFormIO: Found ${hiddenInputs.length} hidden inputs for ${key}`)
        
        for (let i = 0; i < hiddenInputs.length; i++) {
          const hiddenInput = hiddenInputs[i] as HTMLInputElement
          console.log(`SearchableDropdownFormIO: Hidden input ${i} value:`, hiddenInput.value)
          if (hiddenInput && hiddenInput.value) {
            try {
              const parsed = JSON.parse(hiddenInput.value)
              console.log(`SearchableDropdownFormIO: Parsed value from hidden input ${i}:`, parsed)
              const isValid = parsed && (
                (Array.isArray(parsed) && parsed.length > 0) ||
                (typeof parsed === 'string' && parsed.length > 0) ||
                (typeof parsed === 'object' && parsed !== null && 'id' in parsed && 'value' in parsed)
              )
              if (isValid) {
                value = parsed
                console.log('SearchableDropdownFormIO: Using value from hidden input:', value)
                break
              }
            } catch (e) {
              console.log(`SearchableDropdownFormIO: Failed to parse hidden input ${i}:`, e)
            }
          }
        }
      }
      
      if (value) {
        this.currentValue = value
        // Re-render React component with the value
        if (this.reactRoot && SearchableDropdownReact) {
          console.log('SearchableDropdownFormIO: Updating React component with value:', value)
          this.renderReactComponent(SearchableDropdownReact)
        }
      }
    }

    // Mount the React component
    async mountReactComponent(container: HTMLElement) {
      const ROOT_KEY = '__searchableDropdownRoot'
      try {
        // If we already have a root, just re-render (attach can be called more than once)
        if (this.reactRoot) {
          const Component = await loadReactComponent()
          if (Component) this.renderReactComponent(Component)
          return
        }

        // If this container already has a root (e.g. ref resolved to our inner div), reuse it
        const existingRoot = (container as any)[ROOT_KEY] as Root | undefined
        if (existingRoot) {
          this.reactRoot = existingRoot
          this.reactContainer = container
          const Component = await loadReactComponent()
          if (Component) this.renderReactComponent(Component)
          return
        }

        // Clear placeholder content
        container.innerHTML = ''
        
        // Create a div for React to mount into
        this.reactContainer = document.createElement('div')
        this.reactContainer.className = 'searchable-dropdown-react-mount'
        container.appendChild(this.reactContainer)
        
        // Load the React component
        const Component = await loadReactComponent()
        if (!Component) {
          console.error('Failed to load SearchableDropdownReact component')
          return
        }
        
        // Before mounting, try to get any existing value
        this.tryLoadInitialValue()
        
        // Create React root and render (only if this node doesn't already have one)
        const existingOnNode = (this.reactContainer as any)[ROOT_KEY] as Root | undefined
        if (existingOnNode) {
          this.reactRoot = existingOnNode
        } else {
          this.reactRoot = createRoot(this.reactContainer)
          ;(this.reactContainer as any)[ROOT_KEY] = this.reactRoot
        }
        this.renderReactComponent(Component)
        
        console.log('SearchableDropdownFormIO: React component mounted with value:', this.currentValue)
      } catch (error) {
        console.error('SearchableDropdownFormIO: Error mounting React component:', error)
        container.innerHTML = '<div style="color: red;">Error loading dropdown</div>'
      }
    }

    // Render or re-render the React component
    renderReactComponent(Component: React.ComponentType<any>) {
      if (!this.reactRoot) return
      
      const props = {
        name: this.component.key || 'searchableDropdown',
        apiUrl: this.apiUrl,
        isMultiple: this.isMultiple,
        placeholder: this.component.placeholder || 'Type to search...',
        minSearchLength: this.component.minSearchLength ?? 2,
        debounceDelay: this.component.debounceDelay ?? 300,
        value: this.currentValue,
        onChange: this.handleReactChange.bind(this),
      }
      
      this.reactRoot.render(React.createElement(Component, props))
    }

    // Handle value changes from React component
    handleReactChange(newValue: ApiResponseItem | ApiResponseItem[] | null) {
      console.log('SearchableDropdownFormIO: Value changed:', newValue)
      
      this.currentValue = newValue
      
      // Update FormIO data model
      const key = this.component.key
      if (this.data && key) {
        this.data[key] = newValue
      }
      if (this.root?.data && key) {
        this.root.data[key] = newValue
      }
      
      // Trigger FormIO change event
      this.triggerChange()
    }

    // Get current value
    getValue() {
      return this.currentValue
    }

    // Set value (called by FormIO when loading data)
    setValue(value: any, flags?: any) {
      console.log('SearchableDropdownFormIO setValue:', value)
      
      if (value === undefined) return
      
      // Don't clear existing value with empty value
      const isEmpty = value === null || value === '' || (Array.isArray(value) && value.length === 0)
      if (isEmpty && this.currentValue) {
        console.log('SearchableDropdownFormIO: Ignoring empty value, keeping:', this.currentValue)
        return
      }
      
      this.currentValue = value
      
      // Re-render React component with new value if mounted
      if (this.reactRoot && SearchableDropdownReact) {
        this.renderReactComponent(SearchableDropdownReact)
      }
      
      return super.setValue(value, flags)
    }

    // Get the value for submission
    get dataValue() {
      return this.currentValue
    }

    // Set the value from submission (don't call setValue here or we recurse with parent's setValue)
    set dataValue(value: any) {
      if (value === undefined) return
      const isEmpty = value === null || value === '' || (Array.isArray(value) && value.length === 0)
      if (isEmpty && this.currentValue) return
      this.currentValue = value
      if (this.reactRoot && SearchableDropdownReact) {
        this.renderReactComponent(SearchableDropdownReact)
      }
    }

    // Cleanup when component is destroyed
    destroy() {
      const root = this.reactRoot
      this.reactRoot = null
      this.reactContainer = null

      if (root) {
        // Defer unmount to avoid "Attempted to synchronously unmount a root while
        // React was already rendering" - destroy() can be called during React's
        // unmount phase (e.g. when navigating on Next button), so we must not
        // synchronously unmount a React root while React is still processing.
        queueMicrotask(() => {
          try {
            root.unmount()
          } catch {
            // Root may already be unmounted
          }
        })
      }
      super.destroy()
    }

    // Prevent parent's URL fetching
    loadItems() {
      return Promise.resolve()
    }

    updateItems() {
      return
    }

    setItems() {
      return
    }
  }
}

export default createSearchableDropdownClass
