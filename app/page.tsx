import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-gray-50 font-sans">
      <main className="flex w-full max-w-4xl flex-col items-center justify-center py-16 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome to MedQuest Kolea
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Form management and submission system
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full">
          <Link
            href="/forms/contact-us"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="text-center">
              <div className="text-3xl mb-4">📧</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Contact Us
              </h2>
              <p className="text-gray-600 text-sm">
                Get in touch with us through our contact form
              </p>
            </div>
          </Link>

          <Link
            href="/forms/user-registration"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="text-center">
              <div className="text-3xl mb-4">👤</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                User Registration
              </h2>
              <p className="text-gray-600 text-sm">
                Register for a new account
              </p>
            </div>
          </Link>

          <Link
            href="/forms/employee-feedback"
            className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
          >
            <div className="text-center">
              <div className="text-3xl mb-4">💬</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Employee Feedback
              </h2>
              <p className="text-gray-600 text-sm">
                Share your feedback and suggestions
              </p>
            </div>
          </Link>
        </div>
      </main>
    </div>
  );
}
