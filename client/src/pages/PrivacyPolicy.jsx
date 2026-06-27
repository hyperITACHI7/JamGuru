import { Link } from 'react-router-dom'

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-[#121212] text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/login" className="text-[#1DB954] text-sm hover:underline mb-8 inline-block">
          ← Back to Login
        </Link>

        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-[#878787] text-sm mb-10">Last updated: June 2025</p>

        <div className="space-y-8 text-[#b3b3b3] leading-relaxed">

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">1. Who We Are</h2>
            <p>
              JamGuru is a music discovery and social app that connects with your Spotify account
              to help you find music, share songs with friends, and get AI-powered recommendations.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">2. What Data We Collect</h2>
            <p className="mb-3">When you connect your Spotify account, we collect:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Your Spotify display name and profile picture</li>
              <li>Your Spotify email address</li>
              <li>Your Spotify user ID</li>
              <li>Your saved/liked songs (only when you choose to sync them)</li>
            </ul>
            <p className="mt-3">
              If you register with a username and password instead, we collect only your
              username and a securely hashed version of your password.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">3. How We Use Your Data</h2>
            <ul className="list-disc pl-5 space-y-1">
              <li>To create and manage your JamGuru account</li>
              <li>To generate personalised music recommendations based on your taste</li>
              <li>To let you share songs and recommendations with other JamGuru users</li>
              <li>To display your profile to other users you connect with</li>
            </ul>
            <p className="mt-3">We do not sell your data to any third party.</p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">4. Spotify Data</h2>
            <p>
              We access your Spotify data only through Spotify&apos;s official OAuth flow using
              the following permissions: <span className="text-white font-mono text-sm">user-read-private</span>,{' '}
              <span className="text-white font-mono text-sm">user-read-email</span>, and{' '}
              <span className="text-white font-mono text-sm">user-library-read</span>.
              You can revoke this access at any time from your{' '}
              <a
                href="https://www.spotify.com/account/apps/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1DB954] hover:underline"
              >
                Spotify account settings
              </a>.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">5. Data Storage & Security</h2>
            <p>
              Your data is stored in a secured database. Passwords are hashed using bcrypt and
              never stored in plain text. Spotify access tokens are stored securely and used only
              to fetch your music data on your behalf.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">6. Your Rights</h2>
            <p>
              You can request deletion of your account and all associated data at any time by
              contacting us at the email below. We will process your request within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">7. Contact</h2>
            <p>
              For any privacy-related questions or requests, contact us at{' '}
              <a href="mailto:arpitshukla0664@gmail.com" className="text-[#1DB954] hover:underline">
                arpitshukla0664@gmail.com
              </a>.
            </p>
          </section>

        </div>
      </div>
    </div>
  )
}
