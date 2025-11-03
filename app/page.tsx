import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The VoTer GuidEr - Track Your Voting Choices',
  description: 'Create, save, and share your voter guide for elections across multiple jurisdictions.',
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">The VoTer GuidEr</h1>
            <nav className="flex gap-4">
              <a href="/" className="text-gray-600 hover:text-gray-800">Home</a>
              <a href="/guides" className="text-gray-600 hover:text-gray-800">My Guides</a>
              <a href="/guide/new" className="text-blue-600 hover:text-blue-800">New Guide</a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-800 mb-4">
            Track Your Voting Choices
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Create personalized voter guides for upcoming elections. Save your choices, 
            add notes, and easily share with others.
          </p>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Save & Return</h3>
            <p className="text-gray-600">
              Your choices are automatically saved. Return anytime to review or update your guide.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Easy Sharing</h3>
            <p className="text-gray-600">
              Share your guide with friends and family using a simple link. No account required.
            </p>
          </div>
          <div className="bg-white rounded-lg p-6 shadow-md">
            <h3 className="text-xl font-semibold mb-2 text-gray-800">Future Proof</h3>
            <p className="text-gray-600">
              Built to handle elections across multiple jurisdictions and election cycles.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center">
          <a
            href="/guide/new"
            className="inline-block px-8 py-4 bg-blue-600 text-white rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
          >
            Create Your First Guide
          </a>
        </div>
      </main>
    </div>
  )
}
