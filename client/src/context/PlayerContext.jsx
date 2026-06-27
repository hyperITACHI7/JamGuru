import { createContext, useContext, useRef, useState } from 'react'
import { getSong } from '../api/songs'

const noop = () => {}
const PlayerCtx = createContext({
  track: null, playing: false, progress: 0, duration: 30, volume: 0.7,
  play: noop, pause: noop, toggle: noop, seek: noop, changeVolume: noop,
  isActive: () => false,
})

export function PlayerProvider({ children }) {
  const audioRef   = useRef(null)
  const [track, setTrack]       = useState(null)
  const [playing, setPlaying]   = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(30)
  const [volume, setVol]        = useState(0.7)

  function _loadAudio(song) {
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.ontimeupdate = null
      audioRef.current.onended      = null
      audioRef.current.onloadedmetadata = null
    }
    const audio = new Audio(song.previewUrl)
    audio.volume = volume
    audio.ontimeupdate      = () => setProgress(audio.currentTime)
    audio.onended           = () => { setPlaying(false); setProgress(0) }
    audio.onloadedmetadata  = () => setDuration(audio.duration || 30)
    audioRef.current = audio
    setProgress(0)
    setDuration(30)
    return audio
  }

  async function play(song) {
    if (!song) return

    // If previewUrl is missing, fetch the full track from the API
    let resolved = song
    if (!resolved.previewUrl) {
      try {
        const { data } = await getSong(song.spotifyId)
        resolved = data
      } catch {
        return
      }
    }
    if (!resolved.previewUrl) return

    if (track?.spotifyId === resolved.spotifyId && audioRef.current) {
      audioRef.current.play().catch(() => {})
      setPlaying(true)
      return
    }
    const audio = _loadAudio(resolved)
    setTrack(resolved)
    audio.play().catch(() => {})
    setPlaying(true)
  }

  function pause() {
    audioRef.current?.pause()
    setPlaying(false)
  }

  async function toggle(song) {
    if (!song) return
    if (playing && track?.spotifyId === song.spotifyId) {
      pause()
    } else {
      await play(song)
    }
  }

  function seek(sec) {
    if (audioRef.current) audioRef.current.currentTime = sec
    setProgress(sec)
  }

  function changeVolume(v) {
    setVol(v)
    if (audioRef.current) audioRef.current.volume = v
  }

  function isActive(song) {
    return !!track && track.spotifyId === song?.spotifyId
  }

  return (
    <PlayerCtx.Provider value={{ track, playing, progress, duration, volume, play, pause, toggle, seek, changeVolume, isActive }}>
      {children}
    </PlayerCtx.Provider>
  )
}

export const usePlayer = () => useContext(PlayerCtx)
