import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './components/ui'
import { DataProvider } from './context/DataContext'
import { TransactionDrawerProvider } from './components/TransactionDrawer'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ToastProvider>
      <ConfirmProvider>
        <HashRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <DataProvider>
            <TransactionDrawerProvider>
              <App />
            </TransactionDrawerProvider>
          </DataProvider>
        </HashRouter>
      </ConfirmProvider>
    </ToastProvider>
  </StrictMode>,
)
