import React from 'react'
import ReactDOM from 'react-dom/client'
import { FallingLeaves } from 'falling-leaves/react'
import App from './App.jsx'
import './styles.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FallingLeaves fullScreen shapes={['maple']} />
    <App />
  </React.StrictMode>
)
