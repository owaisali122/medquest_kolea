/**
 * Custom FormIO Components Registry
 * Registers custom components with FormIO before forms are created.
 */

import { createSearchableDropdownClass } from './SearchableDropdownFormIO'
import { createSSNMaskingClass } from './SSNMaskingFormIO'
import { createTabNavigationButtonsClass } from './TabNavigationButtonsFormIO'
import { createTabProgressClass } from './TabProgressFormIO'
import { createFieldReferenceClass } from './FieldReferenceFormIO'
import { createAppDetailRefClass } from './AppDetailRefFormIO'

let componentsRegistered = false

export async function registerCustomComponents(): Promise<void> {
  if (componentsRegistered) return
  if (typeof window === 'undefined') return

  try {
    const formioModule = await import('formiojs')
    const Formio = (formioModule as any).Formio || (formioModule as any).default?.Formio || (formioModule as any).default

    if (!Formio?.Components?.components) {
      console.warn('FormIO Components API not available')
      return
    }

    ;(window as any).Formio = Formio

    // DOCUMENT UPLOAD COMPONENT
    const FieldComponent = Formio.Components.components.field
    if (!FieldComponent) {
      console.warn('FieldComponent not found')
      return
    }
    
    class DocumentUpload extends FieldComponent {
      static schema(overrides?: any) {
        return FieldComponent.schema({
          type: 'documentUpload',
          label: 'Document Upload',
          key: 'document',
          input: true,
          placeholder: 'Select or drag a document file here',
          uploadEndpoint: '/api/upload',
          fileMaxSize: '10MB',
          allowMultiple: false,
          showPreview: true,
          ...overrides,
        })
      }

      static get builderInfo() {
        return {
          title: 'Document Upload',
          group: 'basic',
          icon: 'upload',
          weight: 25,
          schema: DocumentUpload.schema(),
        }
      }

      uploadedFiles: any[] = []
      dropZone: HTMLElement | null = null
      fileInput: HTMLInputElement | null = null
      previewContainer: HTMLElement | null = null

      get defaultSchema() {
        return DocumentUpload.schema()
      }

      render() {
        return super.render(`
          <div class="document-upload-container" ref="container">
            <div class="document-upload-dropzone" ref="dropzone">
              <div class="dropzone-content">
                <span class="dropzone-icon">📄</span>
                <span class="dropzone-text">${this.component.placeholder || 'Select or drag a document file here'}</span>
                <button type="button" class="dropzone-btn" ref="browseBtn">Browse Files</button>
              </div>
              <input type="file" ref="fileInput" style="display: none;" 
                ${this.component.allowMultiple ? 'multiple' : ''} 
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.rtf,.odt,.ods,.odp">
            </div>
            <div class="document-upload-preview" ref="preview"></div>
            <div class="document-upload-error" ref="error" style="display: none;"></div>
          </div>
        `)
      }

      attach(element: HTMLElement) {
        const result = super.attach(element)
        
        this.loadRefs(element, {
          container: 'single',
          dropzone: 'single',
          fileInput: 'single',
          browseBtn: 'single',
          preview: 'single',
          error: 'single',
        })

        setTimeout(() => {
          this.setupUploader()
          this.applyStyles()
        }, 100)

        return result
      }

      setupUploader() {
        const dropzone = this.refs.dropzone as HTMLElement
        const fileInput = this.refs.fileInput as HTMLInputElement
        const browseBtn = this.refs.browseBtn as HTMLButtonElement

        if (!dropzone || !fileInput) return

        this.dropZone = dropzone
        this.fileInput = fileInput
        this.previewContainer = this.refs.preview as HTMLElement

        if (browseBtn) {
          browseBtn.addEventListener('click', (e) => {
            e.preventDefault()
            e.stopPropagation()
            fileInput.click()
          })
        }

        dropzone.addEventListener('click', () => {
          fileInput.click()
        })

        fileInput.addEventListener('change', () => {
          if (fileInput.files && fileInput.files.length > 0) {
            this.handleFiles(Array.from(fileInput.files))
          }
        })

        dropzone.addEventListener('dragover', (e) => {
          e.preventDefault()
          e.stopPropagation()
          dropzone.classList.add('dragover')
        })

        dropzone.addEventListener('dragleave', (e) => {
          e.preventDefault()
          e.stopPropagation()
          dropzone.classList.remove('dragover')
        })

        dropzone.addEventListener('drop', (e) => {
          e.preventDefault()
          e.stopPropagation()
          dropzone.classList.remove('dragover')
          
          if (e.dataTransfer?.files && e.dataTransfer.files.length > 0) {
            this.handleFiles(Array.from(e.dataTransfer.files))
          }
        })

        const existingValue = this.dataValue
        if (existingValue && Array.isArray(existingValue)) {
          this.uploadedFiles = existingValue
          this.renderPreviews()
        }
      }

      async handleFiles(files: File[]) {
        const endpoint = this.component.uploadEndpoint || '/api/upload'
        const maxSizeStr = this.component.fileMaxSize || '10MB'
        const maxSize = this.parseFileSize(maxSizeStr)
        
        this.showError('')

        for (const file of files) {
          if (file.size > maxSize) {
            this.showError(`File "${file.name}" exceeds max size of ${maxSizeStr}`)
            continue
          }

          const allowedExtensions = ['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.rtf', '.odt', '.ods', '.odp']
          const ext = '.' + file.name.split('.').pop()?.toLowerCase()
          if (!allowedExtensions.includes(ext)) {
            this.showError(`File "${file.name}" has unsupported type`)
            continue
          }

          try {
            this.setLoading(true)
            
            const formData = new FormData()
            formData.append('file', file)

            const response = await fetch(endpoint, {
              method: 'POST',
              body: formData,
            })

            if (!response.ok) {
              const error = await response.json()
              throw new Error(error.error || 'Upload failed')
            }

            const result = await response.json()
            
            if (result.success && result.files && result.files.length > 0) {
              const uploadedFile = result.files[0]
              
              if (!this.component.allowMultiple) {
                this.uploadedFiles = [uploadedFile]
              } else {
                this.uploadedFiles.push(uploadedFile)
              }
              
              this.renderPreviews()
              this.updateValue()
            }
          } catch (error: any) {
            this.showError(`Failed to upload "${file.name}": ${error.message}`)
          } finally {
            this.setLoading(false)
          }
        }
      }

      parseFileSize(sizeStr: string): number {
        const match = sizeStr.match(/^(\d+(?:\.\d+)?)\s*(KB|MB|GB)?$/i)
        if (!match) return 10 * 1024 * 1024
        
        const num = parseFloat(match[1])
        const unit = (match[2] || 'MB').toUpperCase()
        
        switch (unit) {
          case 'KB': return num * 1024
          case 'MB': return num * 1024 * 1024
          case 'GB': return num * 1024 * 1024 * 1024
          default: return num * 1024 * 1024
        }
      }

      renderPreviews() {
        if (!this.previewContainer) return
        
        this.previewContainer.innerHTML = ''
        
        if (!this.component.showPreview || this.uploadedFiles.length === 0) return

        this.uploadedFiles.forEach((file, index) => {
          const item = document.createElement('div')
          item.className = 'upload-preview-item'
          item.innerHTML = `
            <span class="preview-icon">📄</span>
            <span class="preview-name">${file.originalName || file.name || 'Document'}</span>
            <span class="preview-size">${this.formatFileSize(file.size || 0)}</span>
            <button type="button" class="preview-remove" data-index="${index}">✕</button>
          `
          
          const removeBtn = item.querySelector('.preview-remove')
          if (removeBtn) {
            removeBtn.addEventListener('click', (e) => {
              e.preventDefault()
              e.stopPropagation()
              this.removeFile(index)
            })
          }
          
          this.previewContainer!.appendChild(item)
        })
      }

      removeFile(index: number) {
        this.uploadedFiles.splice(index, 1)
        this.renderPreviews()
        this.updateValue()
      }

      formatFileSize(bytes: number): string {
        if (bytes < 1024) return bytes + ' B'
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
      }

      showError(message: string) {
        const errorEl = this.refs.error as HTMLElement
        if (errorEl) {
          errorEl.textContent = message
          errorEl.style.display = message ? 'block' : 'none'
        }
      }

      setLoading(loading: boolean) {
        if (this.dropZone) {
          this.dropZone.classList.toggle('loading', loading)
          const text = this.dropZone.querySelector('.dropzone-text')
          if (text) {
            text.textContent = loading ? 'Uploading...' : (this.component.placeholder || 'Select or drag a document file here')
          }
        }
      }

      updateValue() {
        this.dataValue = this.uploadedFiles.length > 0 ? this.uploadedFiles : null
        this.triggerChange()
      }

      get dataValue() {
        return this.uploadedFiles.length > 0 ? this.uploadedFiles : super.dataValue
      }

      set dataValue(value: any) {
        if (value && Array.isArray(value)) {
          this.uploadedFiles = value
        } else if (value && typeof value === 'object') {
          this.uploadedFiles = [value]
        } else {
          this.uploadedFiles = []
        }
        super.dataValue = this.uploadedFiles.length > 0 ? this.uploadedFiles : null
      }

      applyStyles() {
        const styleId = 'document-upload-styles'
        if (document.getElementById(styleId)) return

        const style = document.createElement('style')
        style.id = styleId
        style.textContent = `
          .document-upload-container {
            width: 100%;
          }
          .document-upload-dropzone {
            border: 2px dashed #ccc;
            border-radius: 8px;
            padding: 30px 20px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s ease;
            background: #fafafa;
          }
          .document-upload-dropzone:hover,
          .document-upload-dropzone.dragover {
            border-color: #007bff;
            background: #f0f7ff;
          }
          .document-upload-dropzone.loading {
            opacity: 0.6;
            pointer-events: none;
          }
          .dropzone-content {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
          }
          .dropzone-icon {
            font-size: 40px;
          }
          .dropzone-text {
            color: #666;
            font-size: 14px;
          }
          .dropzone-btn {
            padding: 8px 16px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
          }
          .dropzone-btn:hover {
            background: #0056b3;
          }
          .document-upload-preview {
            margin-top: 10px;
          }
          .upload-preview-item {
            display: flex;
            align-items: center;
            gap: 10px;
            padding: 10px;
            background: #f5f5f5;
            border-radius: 4px;
            margin-bottom: 5px;
          }
          .preview-icon {
            font-size: 20px;
          }
          .preview-name {
            flex: 1;
            font-size: 14px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
          }
          .preview-size {
            color: #888;
            font-size: 12px;
          }
          .preview-remove {
            background: none;
            border: none;
            color: #dc3545;
            cursor: pointer;
            font-size: 16px;
            padding: 2px 6px;
          }
          .preview-remove:hover {
            background: #fee;
            border-radius: 4px;
          }
          .document-upload-error {
            color: #dc3545;
            font-size: 12px;
            margin-top: 8px;
            padding: 8px;
            background: #fee;
            border-radius: 4px;
          }
        `
        document.head.appendChild(style)
      }
    }

    // Register DocumentUpload component
    if (typeof Formio.Components.setComponent === 'function') {
      Formio.Components.setComponent('documentUpload', DocumentUpload)
    } else if (Formio.Components.addComponent) {
      Formio.Components.addComponent('documentUpload', DocumentUpload)
    } else {
      Formio.Components.components.documentUpload = DocumentUpload
    }

    // SSN MASKING COMPONENT
    const TextFieldComponent = Formio.Components.components.textfield
    if (TextFieldComponent) {
      console.log('Registering SSNMasking component...')
      const SSNMasking = createSSNMaskingClass(TextFieldComponent)
      
      // Register SSNMasking component with both 'ssn' and 'ssnMasking' names
      // This ensures compatibility with forms that use either type name
      const registerComponent = (name: string) => {
        if (typeof Formio.Components.setComponent === 'function') {
          Formio.Components.setComponent(name, SSNMasking)
          console.log(`SSNMasking registered as '${name}' via setComponent`)
        } else if (Formio.Components.addComponent) {
          Formio.Components.addComponent(name, SSNMasking)
          console.log(`SSNMasking registered as '${name}' via addComponent`)
        } else {
          Formio.Components.components[name] = SSNMasking
          console.log(`SSNMasking registered as '${name}' via direct assignment`)
        }
      }
      
      registerComponent('ssn')
      registerComponent('ssnMasking')
    } else {
      console.warn('TextFieldComponent not found, SSNMasking component not registered')
    }

    // SEARCHABLE DROPDOWN COMPONENT (using React-Select)
    console.log('Registering SearchableDropdown component...')
    const SearchableDropdown = createSearchableDropdownClass(FieldComponent)
    console.log('SearchableDropdown class created:', SearchableDropdown)
    
    // Register SearchableDropdown component
    if (typeof Formio.Components.setComponent === 'function') {
      Formio.Components.setComponent('searchableDropdown', SearchableDropdown)
      console.log('SearchableDropdown registered via setComponent')
    } else if (Formio.Components.addComponent) {
      Formio.Components.addComponent('searchableDropdown', SearchableDropdown)
      console.log('SearchableDropdown registered via addComponent')
    } else {
      Formio.Components.components.searchableDropdown = SearchableDropdown
      console.log('SearchableDropdown registered via direct assignment')
    }
    
    // TAB NAVIGATION BUTTONS COMPONENT
    console.log('Registering TabNavigationButtons component...')
    const TabNavigationButtons = createTabNavigationButtonsClass(FieldComponent)
    
    // Register TabNavigationButtons component
    if (typeof Formio.Components.setComponent === 'function') {
      Formio.Components.setComponent('tabnavigationbuttons', TabNavigationButtons)
      console.log('TabNavigationButtons registered via setComponent')
    } else if (Formio.Components.addComponent) {
      Formio.Components.addComponent('tabnavigationbuttons', TabNavigationButtons)
      console.log('TabNavigationButtons registered via addComponent')
    } else {
      Formio.Components.components.tabnavigationbuttons = TabNavigationButtons
      console.log('TabNavigationButtons registered via direct assignment')
    }

    // TAB PROGRESS COMPONENT
    console.log('Registering TabProgress component...')
    const TabProgress = createTabProgressClass(FieldComponent)
    
    // Register TabProgress component
    if (typeof Formio.Components.setComponent === 'function') {
      Formio.Components.setComponent('tabprogress', TabProgress)
      console.log('TabProgress registered via setComponent')
    } else if (Formio.Components.addComponent) {
      Formio.Components.addComponent('tabprogress', TabProgress)
      console.log('TabProgress registered via addComponent')
    } else {
      Formio.Components.components.tabprogress = TabProgress
      console.log('TabProgress registered via direct assignment')
    }

    // FIELD REFERENCE COMPONENT (resolves referenceKey to same-form field)
    const FieldReference = createFieldReferenceClass(FieldComponent)
    if (typeof Formio.Components.setComponent === 'function') {
      Formio.Components.setComponent('fieldReference', FieldReference)
    } else if (Formio.Components.addComponent) {
      Formio.Components.addComponent('fieldReference', FieldReference)
    } else {
      Formio.Components.components.fieldReference = FieldReference
    }

    // APP DETAIL REF COMPONENT (embeds another form by selectedFormId)
    const AppDetailRef = createAppDetailRefClass(FieldComponent)
    if (typeof Formio.Components.setComponent === 'function') {
      Formio.Components.setComponent('appDetailRef', AppDetailRef)
    } else if (Formio.Components.addComponent) {
      Formio.Components.addComponent('appDetailRef', AppDetailRef)
    } else {
      Formio.Components.components.appDetailRef = AppDetailRef
    }

    console.log('Custom components registration complete. Available components:', Object.keys(Formio.Components.components))
    console.log('SSNMasking registered:', !!Formio.Components.components.ssnMasking)
    console.log('TabNavigationButtons registered:', !!Formio.Components.components.tabnavigationbuttons)
    console.log('TabProgress registered:', !!Formio.Components.components.tabprogress)

    componentsRegistered = true

  } catch (error) {
    console.error('Error registering custom components:', error)
  }
}
