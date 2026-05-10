import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { SocketProvider } from './context/SocketContext'
import { ConnectionBanner } from './components/ConnectionBanner'
import HomePage from './pages/HomePage'
import LobbyPage from './pages/LobbyPage'
import GamePage from './pages/GamePage'

export default function App() {
  return (
    <SocketProvider>
      <ConnectionBanner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/room/:roomId" element={<LobbyPage />} />
          <Route path="/room/:roomId/game" element={<GamePage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </SocketProvider>
  )
}
