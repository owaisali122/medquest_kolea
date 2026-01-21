export function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-50 border-t border-gray-200 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              MedQuest Kolea
            </h3>
            <p className="text-gray-600 text-sm">
              Form management and submission system
            </p>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              Quick Links
            </h4>
            <ul className="space-y-2 text-sm">
              <li>
                <a
                  href="/forms/contact-us"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Contact Us
                </a>
              </li>
              <li>
                <a
                  href="/forms/user-registration"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  User Registration
                </a>
              </li>
              <li>
                <a
                  href="/forms/employee-feedback"
                  className="text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Employee Feedback
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-sm font-semibold text-gray-900 mb-4">
              Information
            </h4>
            <p className="text-gray-600 text-sm">
              © {currentYear} MedQuest Kolea. All rights reserved.
            </p>
          </div>
        </div>
        <div className="mt-8 pt-8 border-t border-gray-200 text-center text-sm text-gray-600">
          <p>Powered by FormIO & Next.js</p>
        </div>
      </div>
    </footer>
  )
}
