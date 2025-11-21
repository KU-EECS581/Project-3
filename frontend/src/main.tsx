/**
 * @file main.tsx
 * @description Entry point for the React application.
 * @class N/A
 * @module Frontend Bootstrap
 * @inputs N/A
 * @outputs Root React render
 * @external_sources React, ReactDOM
 * @author Riley Meyerkorth
 * @date 2025-10-24
 */

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import '@styles/global.css';
import '@styles/tokens.css';
import App from './layout/App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
