import { Routes, Route } from 'react-router-dom'
import AdminPage from './pages/AdminPage'
import InvitationPage from './pages/InvitationPage'
import SeatingPage from './pages/SeatingPage'
import PhotoPage from './pages/PhotoPage'

function App() {
  return (
    <Routes>
      <Route path="/admin" element={<AdminPage />} />
      <Route path="/invite/:token" element={<InvitationPage />} />
      <Route path="/" element={<AdminPage />} />
      <Route path="/seating" element={<SeatingPage />} />
      <Route path="/photos" element={<PhotoPage />} />
    </Routes>
  )
}

export default App
