import { useState, useEffect } from 'react'
import api from '../api/axios'

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const supported =
    typeof window !== 'undefined' &&
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window

  const [subscribed, setSubscribed] = useState(false)
  const [permission, setPermission] = useState(() =>
    supported ? Notification.permission : 'unsupported'
  )

  useEffect(() => {
    if (!supported) return
    navigator.serviceWorker.register('/sw.js').then(reg => {
      reg.pushManager.getSubscription().then(sub => setSubscribed(!!sub))
    }).catch(() => {})
  }, [])

  async function subscribe() {
    try {
      const reg = await navigator.serviceWorker.ready
      const { data } = await api.get('/notifications/vapid-key')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(data.publicKey),
      })
      await api.post('/notifications/subscribe', sub.toJSON())
      setSubscribed(true)
      setPermission('granted')
    } catch (e) {
      console.error('Push subscribe failed:', e)
    }
  }

  async function unsubscribe() {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await api.delete('/notifications/subscribe', { data: { endpoint: sub.endpoint } })
        await sub.unsubscribe()
      }
      setSubscribed(false)
    } catch (e) {
      console.error('Push unsubscribe failed:', e)
    }
  }

  async function toggle() {
    if (!supported) return
    if (subscribed) {
      await unsubscribe()
    } else {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm === 'granted') {
        await subscribe()
      }
    }
  }

  return { supported, subscribed, permission, toggle }
}
