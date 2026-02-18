/**
 * TabProgress Custom Component for FormIO
 * This component displays progress indicator for tab-based forms
 */

export function createTabProgressClass(Component: any) {
  return class TabProgress extends Component {
    static schema(overrides?: any) {
      return Component.schema({
        type: 'tabprogress',
        label: 'Tab Progress',
        key: 'tabProgress',
        input: false,
        tableView: false,
        ...overrides,
      })
    }

    static get builderInfo() {
      return {
        title: 'Tab Progress',
        group: 'custom',
        icon: 'tasks',
        weight: 100,
        schema: TabProgress.schema(),
      }
    }

    get defaultSchema() {
      return TabProgress.schema()
    }

    render() {
      // Render a progress indicator container
      // The actual progress will be calculated and displayed by the form wrapper
      return super.render(`
        <div class="tab-progress-container" ref="container">
          <div class="tab-progress-bar" ref="progressBar">
            <div class="tab-progress-fill" ref="progressFill" style="width: 0%;"></div>
          </div>
          <div class="tab-progress-text" ref="progressText">0% Complete</div>
        </div>
      `)
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      
      this.loadRefs(element, {
        container: 'single',
        progressBar: 'single',
        progressFill: 'single',
        progressText: 'single',
      })

      // Apply styles
      setTimeout(() => {
        this.applyStyles()
        this.updateProgress()
      }, 100)

      return result
    }

    updateProgress() {
      // Calculate progress based on form completion
      // This will be enhanced by the form wrapper if needed
      const progressFill = this.refs.progressFill as HTMLElement
      const progressText = this.refs.progressText as HTMLElement
      
      if (!progressFill || !progressText) return

      // Try to get progress from component settings or calculate from form
      const progress = this.component.progress || 0
      const progressPercent = Math.min(100, Math.max(0, progress))
      
      progressFill.style.width = `${progressPercent}%`
      progressText.textContent = `${Math.round(progressPercent)}% Complete`
    }

    applyStyles() {
      const styleId = 'tab-progress-styles'
      if (document.getElementById(styleId)) return

      const style = document.createElement('style')
      style.id = styleId
      style.textContent = `
        .tab-progress-container {
          width: 100%;
          margin: 20px 0;
          padding: 15px;
          background: #f8f9fa;
          border-radius: 8px;
          border: 1px solid #e0e0e0;
        }
        .tab-progress-bar {
          width: 100%;
          height: 24px;
          background: #e0e0e0;
          border-radius: 12px;
          overflow: hidden;
          position: relative;
          margin-bottom: 10px;
        }
        .tab-progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #007bff 0%, #0056b3 100%);
          border-radius: 12px;
          transition: width 0.3s ease;
          position: relative;
        }
        .tab-progress-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: linear-gradient(
            90deg,
            transparent 0%,
            rgba(255, 255, 255, 0.3) 50%,
            transparent 100%
          );
          animation: shimmer 2s infinite;
        }
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        .tab-progress-text {
          text-align: center;
          font-size: 14px;
          font-weight: 500;
          color: #495057;
        }
      `
      document.head.appendChild(style)
    }

    get dataValue() {
      // This component doesn't store data
      return null
    }

    set dataValue(value: any) {
      // This component doesn't store data
    }
  }
}
