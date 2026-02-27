/**
 * FormIO: App Detail Reference Component
 *
 * Embeds another form by form ID (selectedFormId). Fetches the form schema from
 * GET /api/forms/:id and renders it inside this component's container.
 *
 * Schema: type: 'appDetailRef', key, label, selectedFormId (required)
 */

function getFormio(): any {
  if (typeof window !== 'undefined' && (window as any).Formio) {
    return (window as any).Formio
  }
  return null
}

export function createAppDetailRefClass(FieldComponent: any) {
  return class AppDetailRefFormIO extends FieldComponent {
    private embeddedForm: any = null
    private _pendingValue: any = undefined

    static schema(overrides?: any) {
      return FieldComponent.schema({
        type: 'appDetailRef',
        label: 'App Detail Reference',
        key: 'appDetailRef',
        input: true,
        hideLabel: true,
        selectedFormId: null,
        ...overrides,
      })
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this.component.hideLabel = true
    }

    static get builderInfo() {
      return {
        title: 'App Detail Reference',
        group: 'advanced',
        icon: 'list-alt',
        weight: 190,
        schema: AppDetailRefFormIO.schema(),
      }
    }

    get defaultSchema() {
      return AppDetailRefFormIO.schema()
    }

    get selectedFormId(): number | null {
      const id = this.component?.selectedFormId
      if (id == null) return null
      const n = Number(id)
      return Number.isNaN(n) ? null : n
    }

    getValue() {
      if (this.embeddedForm && this.embeddedForm.submission) {
        return this.embeddedForm.submission.data
      }
      return super.getValue()
    }

    setValue(value: any, flags?: any) {
      if (value != null && value !== '') this._pendingValue = value
      if (this.embeddedForm && this.embeddedForm.setSubmission && value != null) {
        this.embeddedForm.setSubmission({ data: value }, flags)
        this._pendingValue = undefined
      }
      return super.setValue(value, flags)
    }

    checkValidity(data: any, dirty?: boolean, row?: any, silentCheck?: boolean) {
      if (this.embeddedForm && typeof this.embeddedForm.checkValidity === 'function') {
        const subData = this.embeddedForm.submission?.data ?? {}
        const valid = this.embeddedForm.checkValidity(subData, true, subData)
        if (!valid) {
          this.setCustomValidity('Please complete the required fields below.', !!dirty)
          if (this.embeddedForm.showErrors) this.embeddedForm.showErrors()
        } else {
          this.setCustomValidity('')
        }
        return valid
      }
      return super.checkValidity(data, dirty, row, silentCheck)
    }

    render() {
      return super.render(`
        <div class="app-detail-ref-container" ref="container">
          <div class="app-detail-ref-placeholder" ref="placeholder">Loading...</div>
        </div>
      `)
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this.loadRefs(element, { container: 'single', placeholder: 'single' })

      if (this.embeddedForm && this.embeddedForm.destroy) {
        this.embeddedForm.destroy()
        this.embeddedForm = null
      }

      const formId = this.selectedFormId
      if (!formId) {
        this.showError('No form selected.')
        return result
      }

      const container = this.refs?.container as HTMLElement | undefined
      const placeholder = this.refs?.placeholder as HTMLElement | undefined
      if (!container || !placeholder) return result

      const Formio = getFormio()
      if (!Formio?.createForm) {
        this.showError('Formio not available.')
        return result
      }

      const baseUrl = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : ''
      const apiUrl = `${baseUrl}/api/forms/${formId}`

      fetch(apiUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`Form ${formId} not found`)
          return res.json()
        })
        .then((formResponse) => {
          const schema = formResponse?.schema ?? formResponse
          if (!schema || typeof schema !== 'object') {
            this.showError('Invalid form schema.')
            return null
          }
          const schemaClone = JSON.parse(JSON.stringify(schema))
          const opts: any = {
            readOnly: this.options?.readOnly ?? false,
            noAlerts: true,
            form: schemaClone,
          }
          return Formio.createForm(placeholder, schemaClone, opts)
        })
        .then(async (form: any) => {
          if (!form) return
          this.embeddedForm = form
          ;(form as any)._formSchema = form.component ?? (form.root?.component)
          if (form.ready) await form.ready
          const key = this.component?.key
          const existingData =
            this._pendingValue ??
            (key && this.root?.data?.[key]) ??
            (key && this.data?.[key])
          if (existingData != null && typeof existingData === 'object' && Object.keys(existingData).length >= 0 && form.setSubmission) {
            form.setSubmission({ data: existingData }, { noValidate: true })
          }
          this._pendingValue = undefined
          form.on('change', () => {
            const key = this.component?.key
            if (!key || !this.root?.data) return
            const subData = this.embeddedForm?.submission?.data
            if (subData == null) return
            this.root.data[key] = subData
            this.triggerChange()
          })
        })
        .catch((err: any) => {
          this.showError(err?.message ?? 'Failed to load form.')
        })

      return result
    }

    private showError(message: string) {
      const container = this.refs?.container as HTMLElement | undefined
      if (!container) return
      const err = document.createElement('div')
      err.className = 'alert alert-danger app-detail-ref-error'
      err.textContent = message
      container.innerHTML = ''
      container.appendChild(err)
    }

    destroy() {
      if (this.embeddedForm && typeof this.embeddedForm.destroy === 'function') {
        try {
          this.embeddedForm.destroy()
        } catch (_) {}
        this.embeddedForm = null
      }
      super.destroy()
    }
  }
}

export default createAppDetailRefClass
