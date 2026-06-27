import { Link } from 'react-router-dom'

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-[#121212] text-white px-6 py-12">
      <div className="max-w-2xl mx-auto">
        <Link to="/login" className="text-[#1DB954] text-sm hover:underline mb-8 inline-block">
          ← Back to Login
        </Link>

        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-[#878787] text-sm mb-10">Last updated: June 2025</p>

        <div className="space-y-8 text-[#b3b3b3] leading-relaxed">

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">1. Acceptance of Terms</h2>
            <p>
              By creating an account on JamGuru you agree to these Terms of Service. If you
              do not agree, please do not use the app.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">2. What JamGuru Is</h2>
            <p>
              JamGuru is a music discovery and social platform. It allows you to connect your
              Spotify account, sync your liked songs, receive AI-powered recommendations, and
              share music with friends. JamGuru is not affiliated with or endorsed by Spotify.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">3. Eligibility</h2>
            <p>
              You must be at least 13 years old to use JamGuru. By using the app you confirm
              that you meet this requirement.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">4. Your Account</h2>
            <p className="mb-3">You are responsible for:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Keeping your login credentials secure</li>
              <li>All activity that occurs under your account</li>
              <li>Ensuring the information you provide is accurate</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">5. Acceptable Use</h2>
            <p className="mb-3">You agree not to:</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>Use JamGuru for any unlawful purpose</li>
              <li>Harass, abuse, or harm other users</li>
              <li>Attempt to access other users&apos; accounts or data</li>
              <li>Scrape, reverse-engineer, or copy the service</li>
              <li>Share content that infringes on any third party&apos;s rights</li>
            </ul>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">6. Spotify Integration</h2>
            <p>
              JamGuru integrates with Spotify&apos;s API in accordance with{' '}
              <a
                href="https://developer.spotify.com/terms"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#1DB954] hover:underline"
              >
                Spotify&apos;s Developer Terms of Service
              </a>. Music content, track metadata, and album art are owned by their respective
              rights holders. JamGuru does not host or stream any audio.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">7. Disclaimers</h2>
            <p>
              JamGuru is provided &ldquo;as is&rdquo; without warranties of any kind. We do not
              guarantee that the service will be uninterrupted, error-free, or that recommendations
              will meet your expectations. AI-generated content is for discovery purposes only.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">8. Termination</h2>
            <p>
              We reserve the right to suspend or terminate accounts that violate these terms.
              You may delete your account at any time by contacting us.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">9. Changes to Terms</h2>
            <p>
              We may update these terms from time to time. Continued use of JamGuru after
              changes are posted constitutes your acceptance of the updated terms.
            </p>
          </section>

          <section>
            <h2 className="text-white text-lg font-semibold mb-3">10. Contact</h2>
            <p>
              Questions about these terms? Reach us at{' '}
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
