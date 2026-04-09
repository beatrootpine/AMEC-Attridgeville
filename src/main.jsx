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
        <Toaster position="top-right" toastOptions={{ style: { background: '#fff', color: '#1a1a1a', border: '1px solid #e8e3d8', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' } }} />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
)
