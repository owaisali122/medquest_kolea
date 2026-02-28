/**
 * FormIO: Field Reference Component
 *
 * Uses the same schema as another field (type, options, validation, masking)
 * but stores its own value. referenceKey points to the primary field whose
 * schema we copy; value is stored at this component's key (data[key]).
 *
 * Renders the real FormIO component for the referenced type so masking,
 * validation, and all built-in behavior are included.
 *
 * Schema: type: 'fieldReference', key, label, referenceKey (required)
 */

/** Cache: formSchema -> (refKey -> resolved component schema). Avoids re-walking the tree for same form + key. */
const resolutionCache = new WeakMap<object, Map<string, any>>()

function getCachedOrFind(schema: object, key: string): any {
  let byKey = resolutionCache.get(schema)
  if (!byKey) {
    byKey = new Map<string, any>()
    resolutionCache.set(schema, byKey)
  }
  let resolved = byKey.get(key)
  if (resolved === undefined) {
    resolved = findComponentByKey(schema, key)
    byKey.set(key, resolved)
  }
  return resolved
}

/**
 * Recursively find a component by key in the schema tree.
 * Supports: components, columns[].components, rows[][].components, tabs[].components, pages[].components (wizard).
 */
function findComponentByKey(comp: any, key: string): any {
  if (!comp) return null
  if (comp.key === key) return comp
  const children: any[] = []
  if (Array.isArray(comp.components)) children.push(...comp.components)
  if (Array.isArray(comp.columns)) comp.columns.forEach((col: any) => { if (col.components) children.push(...col.components) })
  if (Array.isArray(comp.rows)) comp.rows.forEach((row: any) => {
    if (Array.isArray(row)) row.forEach((cell: any) => {
      if (cell?.components) children.push(...cell.components)
      else if (cell && (cell.key != null || cell.type)) children.push(cell)
    })
    else if (row?.components) children.push(...row.components)
  })
  if (Array.isArray(comp.tabs)) comp.tabs.forEach((tab: any) => { if (tab?.components) children.push(...tab.components) })
  if (Array.isArray(comp.pages)) comp.pages.forEach((pg: any) => { if (pg?.components) children.push(...pg.components) })
  for (const c of children) {
    const found = findComponentByKey(c, key)
    if (found) return found
  }
  return null
}

/**
 * Get the form-level schema by walking up to the topmost component.
 * In wizard forms, this.root may be the current page (panel), not the form,
 * so we need the form root to resolve references to fields on other pages.
 * Also checks for _formSchema attached by useFormIOCore (reliable source).
 */
function getFormSchema(instance: any): any {
  let current: any = instance
  let formSchema: any = null
  while (current) {
    if ((current as any)._formSchema && ((current as any)._formSchema.components || (current as any)._formSchema.pages)) {
      return (current as any)._formSchema
    }
    if (current.component && (current.component.components || current.component.pages)) {
      formSchema = current.component
      if (!current.parent) return formSchema
    }
    current = current.parent
  }
  return formSchema
}

let formioGlobal: any = null
function getFormio(): any {
  if (formioGlobal) return formioGlobal
  if (typeof window !== 'undefined') formioGlobal = (window as any).Formio
  return formioGlobal
}

export function createFieldReferenceClass(FieldComponent: any) {
  return class FieldReferenceFormIO extends FieldComponent {
    private refSchema: any = null
    private childComponent: any = null
    private _deferredAttachId: any = null

    static schema(...extend: any[]) {
      return FieldComponent.schema({
        type: 'fieldReference',
        label: 'Field Reference',
        key: 'fieldReference',
        referenceKey: '',
        input: true,
        ...extend,
      })
    }

    static get builderInfo() {
      return {
        title: 'Field Reference',
        group: 'advanced',
        icon: 'link',
        weight: 180,
        schema: FieldReferenceFormIO.schema(),
      }
    }

    get defaultSchema() {
      return FieldReferenceFormIO.schema()
    }

    constructor(component: any, options: any, data: any) {
      super(component, options, data)
      this.component.hideLabel = true
    }

    get referenceKey(): string {
      return (
        this.component?.referenceKey ||
        this.component?.refKey ||
        this.component?.referencedKey ||
        ''
      )
    }

    get dataValue() {
      const key = this.component?.key
      if (!key) return undefined
      const data = this.root?.data ?? this.data ?? {}
      return data[key]
    }

    set dataValue(value: any) {
      const key = this.component?.key
      if (!key) return
      if (this.data) this.data[key] = value
      // Only write to root when at root level (not inside editgrid/datagrid row)
      if (this.root?.data && this.data === this.root.data) this.root.data[key] = value
      this.triggerChange()
    }

    getValue() {
      return this.dataValue
    }

    setValue(value: any, flags?: any) {
      const key = this.component?.key
      if (!key) return
      if (this.data) this.data[key] = value
      // Only write to root when at root level (not inside editgrid/datagrid row)
      if (this.root?.data && this.data === this.root.data) this.root.data[key] = value
      if (this.childComponent && this.childComponent.setValue) {
        this.childComponent.setValue(value, flags)
      }
      return super.setValue(value, flags)
    }

    checkValidity(data: any, dirty?: boolean, row?: any, silentCheck?: boolean) {
      if (this.childComponent && this.childComponent.checkValidity) {
        const isValid = this.childComponent.checkValidity(data, dirty, row, silentCheck)
        this.error = this.childComponent.error ?? null
        if (!isValid && this.childComponent.error) {
          const err = this.childComponent.error
          const messages = err.messages || (err.message ? [{ level: 'error', message: err.message }] : [])
          const messageText = messages.length ? messages.map((m: any) => m.message || m).join(' ') : (err.message || '')
          this.setCustomValidity(messages.length ? messages : err.message || '', !!dirty)
          this.showSingleError(messageText)
        } else if (isValid) {
          this.setCustomValidity('')
          this.showSingleError('')
        }
        this.hideChildErrorElements()
        return isValid
      }
      return super.checkValidity(data, dirty, row, silentCheck)
    }

    private showSingleError(message: string) {
      const el = this.refs?.errorMessage as HTMLElement | undefined
      if (!el) return
      el.textContent = message || ''
      el.style.display = message ? 'block' : 'none'
      const container = this.refs?.container as HTMLElement | undefined
      if (container) container.classList.toggle('is-invalid', !!message)
    }

    private hideChildErrorElements() {
      const container = this.refs?.container as HTMLElement | undefined
      const ourError = this.refs?.errorMessage as HTMLElement | undefined
      if (!container || !ourError) return
      const root = (this as any).element ?? container.closest('.form-group') ?? container.parentElement
      if (!root) return
      const selectors = [
        '.invalid-feedback',
        '.help-block',
        '.error-block',
        '[class*="error-message"]',
        '[class*="invalid-feedback"]',
        '[class*="error-block"]',
        '[role="alert"]',
      ]
      selectors.forEach((sel) => {
        try {
          root.querySelectorAll(sel).forEach((n: Element) => {
            const el = n as HTMLElement
            if (el === ourError || ourError.contains(el)) return
            el.style.setProperty('display', 'none', 'important')
          })
        } catch { /* ignore */ }
      })
    }

    render() {
      return super.render(`
        <div class="field-reference-container" ref="container">
          <div class="field-reference-placeholder" ref="placeholder">Loading...</div>
          <div class="invalid-feedback field-reference-error-msg" ref="errorMessage" style="display: none;"></div>
        </div>
      `)
    }

    /** Resolve form schema from root, options, or parent walk. */
    private getFormSchemaForRef(): any {
      const root = this.root || (this as any).form
      const optionsForm = (this as any).options?.form
      const hasFullSchema = (s: any) => s && (Array.isArray(s?.components) || Array.isArray(s?.pages))
      let formSchema: any =
        (root && (root as any)._formSchema && hasFullSchema((root as any)._formSchema) && (root as any)._formSchema) ||
        (hasFullSchema(optionsForm) && optionsForm) ||
        getFormSchema(this) ||
        root?.component ||
        optionsForm
      if (!formSchema?.components && !formSchema?.pages) {
        let p: any = this.parent
        while (p) {
          if (p.component && (Array.isArray(p.component.components) || Array.isArray(p.component.pages))) {
            formSchema = p.component
            break
          }
          p = p.parent
        }
      }
      return formSchema
    }

    /** Build and attach the referenced field child. Returns true if successful. */
    private tryAttachChild(): boolean {
      const refKey = this.referenceKey
      if (!refKey) return false

      const formSchema = this.getFormSchemaForRef()
      this.refSchema = formSchema ? getCachedOrFind(formSchema, refKey) : null
      if (!this.refSchema) return false

      const container = this.refs?.container as HTMLElement | undefined
      const placeholder = this.refs?.placeholder as HTMLElement | undefined
      if (!container || !placeholder) return false

      const Formio = getFormio()
      if (!Formio?.Components?.create) return false

      const refType = (this.refSchema.type || 'textfield').toLowerCase()
      if (!Formio.Components.components[refType] && !Formio.Components.components.textfield) return false

      const schemaClone =
        typeof structuredClone === 'function'
          ? structuredClone(this.refSchema)
          : JSON.parse(JSON.stringify(this.refSchema))
      schemaClone.key = this.component.key
      schemaClone.label = this.refSchema.label
      schemaClone.id = this.id ? `${this.id}-ref` : undefined

      const options = { ...this.options, parent: this, root: this.root }
      const data = this.root?.data ?? this.data ?? {}

      const child = Formio.Components.create(schemaClone, options, data)
      if (child.init) child.init()

      const childContainer = document.createElement('div')
      child.build(childContainer)
      container.replaceChild(childContainer, placeholder)
      this.childComponent = child
      if (typeof child.attach === 'function') {
        child.attach(childContainer)
      }
      child.setValue(this.dataValue)
      this.hideChildErrorElements()
      return true
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      this.loadRefs(element, { container: 'single', placeholder: 'single', errorMessage: 'single' })

      if (this.childComponent) {
        if (this.childComponent.destroy) this.childComponent.destroy()
        this.childComponent = null
      }

      const refKey = this.referenceKey
      if (!refKey) {
        this.showError('Reference not found.')
        return result
      }

      if (this.tryAttachChild()) return result

      // Schema/ref may not be available yet (_formSchema is set after createForm returns). Retry next tick.
      const id = (this._deferredAttachId = {})
      const tryDeferred = () => {
        if (this._deferredAttachId !== id) return
        this._deferredAttachId = null
        if (this.tryAttachChild()) return
        this.showError('Reference not found.')
      }
      if (typeof requestAnimationFrame !== 'undefined') {
        requestAnimationFrame(() => {
          if (this._deferredAttachId !== id) return
          setTimeout(tryDeferred, 0)
        })
      } else {
        setTimeout(tryDeferred, 0)
      }

      return result
    }

    private showError(message: string) {
      const container = this.refs.container as HTMLElement
      if (container) {
        const err = document.createElement('div')
        err.className = 'alert alert-danger field-reference-error'
        err.textContent = message
        container.innerHTML = ''
        container.appendChild(err)
      }
    }

    destroy() {
      this._deferredAttachId = null
      if (this.childComponent && this.childComponent.destroy) {
        this.childComponent.destroy()
      }
      this.childComponent = null
      this.refSchema = null
      super.destroy()
    }
  }
}

export default createFieldReferenceClass
