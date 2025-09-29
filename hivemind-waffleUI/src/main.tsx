import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)

// Add a safe viewport meta for iOS Safari by injecting if missing
const ensureViewport = () => {
  const existing = document.querySelector('meta[name="viewport"]')
  if (!existing) {
    const meta = document.createElement('meta')
    meta.name = 'viewport'
    meta.content = 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover'
    document.head.appendChild(meta)
  } else if (!existing.getAttribute('content')?.includes('viewport-fit=cover')) {
    existing.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover')
  }
}
ensureViewport()