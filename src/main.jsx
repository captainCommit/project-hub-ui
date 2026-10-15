import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/styles/dark.css'
import { watchSystemTheme } from '@/lib/theme'

watchSystemTheme()

// Pages load on demand, and a deploy deletes the previous build's files. A tab opened before the
// deploy can't fetch them anymore, so reload once to pick up the new build.
// At most once every 10 seconds, so a file that is really missing shows an error instead of looping.
const RELOADED_AT_KEY = 'ph_reloaded_for_new_build_at'
window.addEventListener('vite:preloadError', (event) => {
  try {
    const reloadedAt = Number(sessionStorage.getItem(RELOADED_AT_KEY) || 0)
    if (Date.now() - reloadedAt < 10_000) return
    sessionStorage.setItem(RELOADED_AT_KEY, String(Date.now()))
  } catch {
    return
  }
  event.preventDefault()
  window.location.reload()
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
