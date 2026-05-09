import { useEffect, useState, useCallback } from 'react'
import { socket } from '../lib/socket'
import type { RoomState } from '../types'

export function useSocket() {
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [myId, setMyId] = useState<string>('')
  const [connected, setConnected] = useState(false)

  useEffect(() => {
    socket.connect()

    socket.on('connect', () => {
      setConnected(true)
      setMyId(socket.id ?? '')
    })

    socket.on('disconnect', () => {
      setConnected(false)
    })

    socket.on('room-update', (state) => {
      setRoomState(state)
    })

    return () => {
      socket.off('connect')
      socket.off('disconnect')
      socket.off('room-update')
      socket.disconnect()
    }
  }, [])

  const createRoom = useCallback((name: string): Promise<string> => {
    return new Promise((resolve) => {
      socket.emit('create-room', name, (roomId) => {
        resolve(roomId)
      })
    })
  }, [])

  const joinRoom = useCallback((roomId: string, name: string): Promise<string | null> => {
    return new Promise((resolve) => {
      socket.emit('join-room', roomId, name, (error) => {
        resolve(error)
      })
    })
  }, [])

  const startGame = useCallback(() => {
    socket.emit('start-game')
  }, [])

  const buzz = useCallback(() => {
    socket.emit('buzz')
  }, [])

  const judge = useCallback((correct: boolean) => {
    socket.emit('judge', correct)
  }, [])

  const nextQuestion = useCallback(() => {
    socket.emit('next-question')
  }, [])

  const isHost = roomState?.hostId === myId

  return {
    roomState,
    myId,
    connected,
    isHost,
    createRoom,
    joinRoom,
    startGame,
    buzz,
    judge,
    nextQuestion,
  }
}
