import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SocketProvider } from './context/SocketContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ConnectionBanner from './components/ConnectionBanner'
import BottomNav from './components/BottomNav'

const HomePage         = lazy(() => import('./pages/HomePage'))
const MatchPage        = lazy(() => import('./pages/MatchPage'))
const LobbyPage        = lazy(() => import('./pages/LobbyPage'))
const GamePage         = lazy(() => import('./pages/GamePage'))
const SubmitPage       = lazy(() => import('./pages/SubmitPage'))
const AdminPage        = lazy(() => import('./pages/AdminPage'))
const ProfilePage      = lazy(() => import('./pages/ProfilePage'))
const RankingPage      = lazy(() => import('./pages/RankingPage'))
const UserPage         = lazy(() => import('./pages/UserPage'))
const ContactPage      = lazy(() => import('./pages/ContactPage'))
const ChatPage         = lazy(() => import('./pages/ChatPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const SearchPage       = lazy(() => import('./pages/SearchPage'))
const QuestionSetPage  = lazy(() => import('./pages/QuestionSetPage'))
const FreeLobbyPage    = lazy(() => import('./pages/FreeLobbyPage'))

function Fallback() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)' }}>
      読み込み中...
    </div>
  )
}

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
    <SocketProvider>
      <BrowserRouter>
        <ConnectionBanner />
        <Suspense fallback={<Fallback />}>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/match" element={<MatchPage />} />
            <Route path="/lobby" element={<FreeLobbyPage />} />
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
            <Route path="/sets/:id" element={<QuestionSetPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
        <BottomNav />
      </BrowserRouter>
    </SocketProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
