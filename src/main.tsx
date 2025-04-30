import { createRoot } from 'react-dom/client'
import './style/index.css'
import App from './App.tsx'
import { LocationProvider } from './base/LocationContext.tsx'
import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById('root')!).render(
  <LocationProvider>
    <HelmetProvider>
    <App />
    </HelmetProvider>
  </LocationProvider>,
)
