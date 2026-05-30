import { Navigate, Route, Routes } from 'react-router-dom'

import { AppShell } from './components/AppShell/AppShell.jsx'

import { Home } from './pages/Home/Home.jsx'
import { Accounts } from './pages/Accounts/Accounts.jsx'
import { Transactions } from './pages/Transactions/Transactions.jsx'
import { TransactionStats } from './pages/Transactions/Stats/TransactionStats.jsx'
import { DatePickerPlaceholder } from './pages/TransactionFilter/DatePickerPlaceholder.jsx'
import { TransactionFilter } from './pages/TransactionFilter/TransactionFilter.jsx'
import { TransactionTag } from './pages/TransactionTag/TransactionTag.jsx'
import { TransactionCategory } from './pages/Transactions/Category/TransactionCategory.jsx'
import { Chat } from './pages/Chat/Chat.jsx'
import { ChatHistory } from './pages/ChatHistory/ChatHistory.jsx'
import { Settings } from './pages/Settings/Settings.jsx'
import { Profile } from './pages/Profile/Profile.jsx'
import { ProductEdit } from './pages/ProductEdit/ProductEdit.jsx'

function WithBottomNavLayout() {
  return <AppShell withBottomNav />
}

function NoBottomNavLayout() {
  return <AppShell withBottomNav={false} />
}

function App() {
  return (
    <Routes>
      <Route element={<WithBottomNavLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/transactions" element={<Transactions />} />
      </Route>

      <Route element={<NoBottomNavLayout />}>
        <Route path="/settings" element={<Settings />} />
        <Route path="/accounts" element={<Accounts />} />
        <Route path="/products/:id" element={<ProductEdit />} />
        <Route path="/transactions/stats" element={<TransactionStats />} />
        <Route path="/transactions/filter" element={<TransactionFilter />} />
        <Route
          path="/transactions/filter/date-picker"
          element={<DatePickerPlaceholder />}
        />
        <Route path="/transactions/tags/:tagId" element={<TransactionTag />} />
        <Route
          path="/transactions/categories/:categoryKey"
          element={<TransactionCategory />}
        />
        <Route path="/chat/history" element={<ChatHistory />} />
        <Route path="/chat" element={<Chat />} />
        <Route path="/profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
