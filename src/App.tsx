import { Link, Route, Routes } from 'react-router-dom'
import { Compass } from 'lucide-react'
import { Layout } from './components/Layout'
import { Button } from './components/ui'
import { DashboardPage } from './pages/Dashboard'
import { IncomeExpensesPage } from './pages/IncomeExpenses'
import { TransactionsPage } from './pages/Transactions'
import { MonthlyPage } from './pages/Monthly'
import { EarningsPage } from './pages/Earnings'
import { ClientsPage, ClientDetailPage } from './pages/Clients'
import { AnalyticsPage } from './pages/Analytics'
import { CategoriesPage } from './pages/Categories'
import { SettingsPage } from './pages/Settings'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<DashboardPage />} />
        <Route path="income-expenses" element={<IncomeExpensesPage />} />
        <Route path="transactions" element={<TransactionsPage />} />
        <Route path="monthly" element={<MonthlyPage />} />
        <Route path="earnings" element={<EarningsPage />} />
        <Route path="clients" element={<ClientsPage />} />
        <Route path="clients/:id" element={<ClientDetailPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="categories" element={<CategoriesPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}

function NotFoundPage() {
  return (
    <div className="not-found-page">
      <div className="not-found-icon">
        <Compass size={22} />
      </div>
      <h1>Page not found</h1>
      <p>The page you’re looking for doesn’t exist or has moved.</p>
      <Link to="/">
        <Button variant="primary">Back to dashboard</Button>
      </Link>
    </div>
  )
}
