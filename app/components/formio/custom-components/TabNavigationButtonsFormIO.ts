/**
 * TabNavigationButtons Custom Component for FormIO
 * This component renders navigation buttons for tab-based forms
 */

export function createTabNavigationButtonsClass(Component: any) {
  return class TabNavigationButtons extends Component {
    static schema(overrides?: any) {
      return Component.schema({
        type: 'tabnavigationbuttons',
        label: 'Tab Navigation Buttons',
        key: 'tabNavigationButtons',
        input: false,
        tableView: false,
        ...overrides,
      })
    }

    static get builderInfo() {
      return {
        title: 'Tab Navigation Buttons',
        group: 'custom',
        icon: 'bars',
        weight: 100,
        schema: TabNavigationButtons.schema(),
      }
    }

    get defaultSchema() {
      return TabNavigationButtons.schema()
    }

    render() {
      // This component doesn't render anything visible
      // It's just a container for button configuration
      return super.render(`
        <div class="tab-navigation-buttons-container" style="display: none;">
          <!-- Buttons will be rendered by the form wrapper -->
        </div>
      `)
    }

    attach(element: HTMLElement) {
      const result = super.attach(element)
      
      // Hide this component as it's just a configuration container
      if (element) {
        element.style.display = 'none'
      }

      return result
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
