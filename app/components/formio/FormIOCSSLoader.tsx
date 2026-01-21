'use client'

import { useEffect } from 'react'

/**
 * Loads FormIO CSS dynamically
 */
export function FormIOCSSLoader() {
  useEffect(() => {
    const linkId = 'formio-css'
    
    // Check if CSS is already loaded
    if (document.getElementById(linkId)) {
      return
    }

    // Create and append CSS link
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/api/formio-css'
    link.id = linkId
    document.head.appendChild(link)

    // Cleanup is not needed as CSS should persist
  }, [])

  return null // This component doesn't render anything
}
