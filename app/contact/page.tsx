export default function ContactPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <h1 className="text-4xl font-bold mb-8">Contact Us</h1>
        <div className="bg-gray-50 rounded-lg p-8">
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-2">Email</h2>
              <p className="text-gray-600">hello@bearions.com</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Phone</h2>
              <p className="text-gray-600">+62 812 3456 7890</p>
            </div>
            <div>
              <h2 className="text-xl font-semibold mb-2">Address</h2>
              <p className="text-gray-600">
                Jakarta, Indonesia
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
