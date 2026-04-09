import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './context/AuthContext'
import App from './App'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster position="top-right" toastOptions={{ style: { background: '#1a1a2e', color: '#e8e0d4', border: '1px solid rgba(201,168,76,0.2)' } }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
