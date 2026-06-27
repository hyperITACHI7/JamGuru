import { createContext, useContext, useRef, useState } from 'react'

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

  function play(song) {
    if (!song?.previewUrl) return
    if (track?.spotifyId === song.spotifyId && audioRef.current) {
      audioRef.current.play().catch(() => {})
      setPlaying(true)
      return
    }
    const audio = _loadAudio(song)
    setTrack(song)
    audio.play().catch(() => {})
    setPlaying(true)
  }

  function pause() {
    audioRef.current?.pause()
    setPlaying(false)
  }

  function toggle(song) {
    if (!song?.previewUrl) return
    if (playing && track?.spotifyId === song.spotifyId) {
      pause()
    } else {
      play(song)
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
