import { redirect } from 'next/navigation'

/**
 * Main forms entry point
 * Redirects to the forms list page
 */
export default async function FormsPage() {
  // Redirect to the pending forms list
  redirect('/forms/pending')
}
