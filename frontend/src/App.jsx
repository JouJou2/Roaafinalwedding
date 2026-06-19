import { Routes, Route } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import InvitationPage from './pages/InvitationPage'
import SeatingPage from './pages/SeatingPage'

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/invite/:token" element={<InvitationPage />} />
      <Route path="/" element={<AdminPage />} />
      <Route path="/seating" element={<SeatingPage />} />
    </Routes>
  )
}

export default App
