/**
 * @file main.tsx
 * @description Entry point for the React application.
 * @author Riley Meyerkorth
 * @date 2025-10-24
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
