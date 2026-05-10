import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SocketProvider } from './context/SocketContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import { ConnectionBanner } from './components/ConnectionBanner'
import HomePage from './pages/HomePage'
import LobbyPage from './pages/LobbyPage'
import GamePage from './pages/GamePage'
import SubmitPage from './pages/SubmitPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import ContactPage from './pages/ContactPage'

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <SocketProvider>
      <ConnectionBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<LobbyPage />} />
          <Route path="/room/:roomId/game" element={<GamePage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
