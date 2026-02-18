/**
 * Utilities for panel-based FormIO forms.
 * Panels are used as steps; visibility is controlled by currentStep (1-based) and conditional logic.
 */

/**
 * Get total number of panels (steps).
 */
export function getPanelCount(schema: any): number {
  if (!schema?.components) return 0
  return schema.components.filter((c: any) => c.type === 'panel').length
}

/**
 * Ensure each panel has conditional visibility: show only when currentStep == panel index (1-based).
 * Clones the schema so the original is not mutated.
 */
export function ensurePanelConditionals(schema: any): any {
  if (!schema?.components) return schema
  const next = JSON.parse(JSON.stringify(schema))
  let panelIndex = 0
  next.components = next.components.map((c: any) => {
    if (c.type !== 'panel') return c
    panelIndex += 1
    const stepNum = String(panelIndex)
    return {
      ...c,
      conditional: {
        ...(c.conditional || {}),
        when: 'currentStep',
        eq: stepNum,
        show: true,
      },
    }
  })
  return next
}
