import { createRoot } from 'react-dom/client'
import './style/index.css'
import App from './App.tsx'
import { LocationProvider } from './base/LocationContext.tsx'

createRoot(document.getElementById('root')!).render(
  <LocationProvider>
    <App />
  </LocationProvider>,
)
