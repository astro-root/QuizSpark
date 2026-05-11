import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SocketProvider } from './context/SocketContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ConnectionBanner from './components/ConnectionBanner'
import BottomNav from './components/BottomNav'
import HomePage from './pages/HomePage'
import MatchPage from './pages/MatchPage'
import LobbyPage from './pages/LobbyPage'
import GamePage from './pages/GamePage'
import SubmitPage from './pages/SubmitPage'
import AdminPage from './pages/AdminPage'
import ProfilePage from './pages/ProfilePage'
import RankingPage from './pages/RankingPage'
import UserPage from './pages/UserPage'
import ContactPage from './pages/ContactPage'
import ChatPage from './pages/ChatPage'
import NotificationsPage from './pages/NotificationsPage'
import SearchPage from './pages/SearchPage'

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <SocketProvider>
      <BrowserRouter>
        <ConnectionBanner />
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/match" element={<MatchPage />} />
          <Route path="/room/:roomId" element={<LobbyPage />} />
          <Route path="/room/:roomId/game" element={<GamePage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/ranking" element={<RankingPage />} />
          <Route path="/user/:id" element={<UserPage />} />
          <Route path="/contact" element={<ContactPage />} />
        <Route path="/chat" element={<ChatPage />} />
        <Route path="/chat/:userId" element={<ChatPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/search" element={<SearchPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <BottomNav />
      </BrowserRouter>
    </SocketProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
