import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'
import '@/styles/dark.css'
import { watchSystemTheme } from '@/lib/theme'

watchSystemTheme()

ReactDOM.createRoot(document.getElementById('root')).render(
  <App />
)
