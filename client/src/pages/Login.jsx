import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'

export default function Login() {
  const [form, setForm]       = useState({ username: '', password: '' })
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const { data } = await login(form)
      localStorage.setItem('token', data.token)
      localStorage.setItem('user', JSON.stringify(data.user))
      navigate('/')
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#121212] flex flex-col items-center justify-center px-4">

      {/* Spotify logo */}
      <div className="mb-8 flex flex-col items-center">
        <svg viewBox="0 0 24 24" className="w-10 h-10 fill-white mb-6">
          <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
        </svg>
        <h1 className="text-white font-bold text-3xl text-center">Log in to Spotify</h1>
      </div>

      <div className="w-full max-w-[360px] bg-[#121212] space-y-3">

        {/* Spotify OAuth login — temporarily disabled, dev quota exhausted */}
        <button
          type="button"
          disabled
          title="Spotify login is temporarily unavailable"
          className="w-full flex items-center justify-center gap-3 bg-[#1DB954] text-black font-bold py-3 rounded-full text-sm relative opacity-50 cursor-not-allowed"
        >
          <svg viewBox="0 0 24 24" className="w-5 h-5 fill-black absolute left-4">
            <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
          </svg>
          Continue with Spotify
        </button>

        <div className="flex items-center gap-3 py-2">
          <div className="flex-1 h-px bg-[#292929]" />
          <span className="text-[#878787] text-xs">or</span>
          <div className="flex-1 h-px bg-[#292929]" />
        </div>

        {/* Email/username form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 px-4 py-3 rounded-lg text-sm text-center">
              {error}
            </div>
          )}

          <div className="space-y-1">
            <label className="block text-white text-sm font-bold">Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Username"
              autoComplete="username"
              required
              className="w-full bg-transparent border border-[#878787] hover:border-white focus:border-white text-white px-3 py-3 rounded-md focus:outline-none transition-colors placeholder-[#6a6a6a]"
            />
          </div>

          <div className="space-y-1">
            <label className="block text-white text-sm font-bold">Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Password"
              autoComplete="current-password"
              required
              className="w-full bg-transparent border border-[#878787] hover:border-white focus:border-white text-white px-3 py-3 rounded-md focus:outline-none transition-colors placeholder-[#6a6a6a]"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#1DB954] text-black font-bold py-3 rounded-full hover:scale-[1.02] active:scale-100 transition-transform disabled:opacity-60 disabled:cursor-not-allowed mt-2 text-sm"
          >
            {loading ? 'Logging in…' : 'Log In'}
          </button>
        </form>

        <p className="text-center text-[#878787] text-sm pt-6 pb-2">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-white underline font-semibold hover:text-[#1DB954] transition-colors">
            Sign up for Spotify
          </Link>
        </p>

        <p className="text-center text-[#535353] text-xs pt-4 pb-2 space-x-2">
          <Link to="/privacy" className="hover:text-[#878787] transition-colors">Privacy Policy</Link>
          <span>·</span>
          <Link to="/terms" className="hover:text-[#878787] transition-colors">Terms of Service</Link>
        </p>
      </div>
    </div>
  )
}
