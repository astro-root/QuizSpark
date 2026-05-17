import { lazy, Suspense, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { SocketProvider } from './context/SocketContext'
import { useAuth } from './context/AuthContext'
import { AuthProvider } from './context/AuthContext'
import { ThemeProvider } from './context/ThemeContext'
import ConnectionBanner from './components/ConnectionBanner'
import ErrorBoundary from './components/ErrorBoundary'
import BottomNav from './components/BottomNav'
import PCNav from './components/PCNav'

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
const CreatePage       = lazy(() => import('./pages/CreatePage'))


const TITLES: Record<string, string> = {
  '/':             'QuizSpark ⚡',
  '/lobby':        'フリーマッチ | QuizSpark',
  '/create':       '作問 | QuizSpark',
  '/ranking':      'ランキング | QuizSpark',
  '/profile':      'マイページ | QuizSpark',
  '/chat':         'チャット | QuizSpark',
  '/notifications':'通知 | QuizSpark',
  '/search':       'ユーザー検索 | QuizSpark',
  '/submit':       '問題投稿 | QuizSpark',
  '/admin':        '管理 | QuizSpark',
  '/match':        'マッチング | QuizSpark',
}

function TitleUpdater() {
  const { pathname } = useLocation()
  useEffect(() => {
    const exact = TITLES[pathname]
    if (exact) { document.title = exact; return }
    if (pathname.startsWith('/room/') && pathname.endsWith('/game')) { document.title = '対戦中 | QuizSpark'; return }
    if (pathname.startsWith('/room/'))   { document.title = '待機室 | QuizSpark'; return }
    if (pathname.startsWith('/chat/'))   { document.title = 'チャット | QuizSpark'; return }
    if (pathname.startsWith('/user/'))   { document.title = 'ユーザー | QuizSpark'; return }
    if (pathname.startsWith('/sets/'))   { document.title = '問題セット | QuizSpark'; return }
    document.title = 'QuizSpark ⚡'
  }, [pathname])
  return null
}

function AuthGate({ children }: { children: React.ReactNode }) {
  const { loading } = useAuth()
  if (loading) return <Fallback />
  return <>{children}</>
}

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
      <ErrorBoundary>
        <TitleUpdater />
        <ConnectionBanner />
        <Suspense fallback={<Fallback />}>
          <AuthGate>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/match" element={<MatchPage />} />
            <Route path="/lobby" element={<FreeLobbyPage />} />
            <Route path="/create" element={<CreatePage />} />
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
          </AuthGate>
        </Suspense>
        <BottomNav />
        <PCNav />
      </ErrorBoundary>
      </BrowserRouter>
    </SocketProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
