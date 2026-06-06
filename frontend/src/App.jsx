import { Routes, Route } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import InvitationPage from './pages/InvitationPage'

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/invite/:token" element={<InvitationPage />} />
      <Route path="/" element={<AdminPage />} />
    </Routes>
  )
}

export default App
