import { useState, useEffect } from 'react'

// Tracks window.visualViewport's height and top offset. Mobile browsers shrink/pan the
// *visual* viewport when the on-screen keyboard opens, without moving the *layout*
// viewport by the same amount — but `position: fixed` elements are anchored to the layout
// viewport, so a fixed full-screen overlay can end up rendered partly above the visible
// area once the keyboard is up, even though nothing inside it actually scrolled. Anchoring
// the overlay's top/height to this hook's values instead of raw inset-0 keeps it matching
// what's actually on screen.
export function useVisualViewport() {
  const [viewport, setViewport] = useState(() => {
    if (typeof window === 'undefined' || !window.visualViewport) return null
    return { height: window.visualViewport.height, offsetTop: window.visualViewport.offsetTop }
  })

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function handle() {
      setViewport({ height: vv.height, offsetTop: vv.offsetTop })
    }

    vv.addEventListener('resize', handle)
    vv.addEventListener('scroll', handle)
    handle()

    return () => {
      vv.removeEventListener('resize', handle)
      vv.removeEventListener('scroll', handle)
    }
  }, [])

  return viewport
}
