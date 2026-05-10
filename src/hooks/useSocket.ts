import { useEffect, useState, useCallback, useRef } from 'react'
import { socket } from '../lib/socket'
import type { RoomState, GameSettings } from '../types'

export function useSocket() {
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [myId, setMyId] = useState<string>('')
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)

  // 再接続後のルーム復元用
  const savedRoomId = useRef<string | null>(null)
  const savedName = useRef<string | null>(null)

  useEffect(() => {
    function onConnect() {
      setConnected(true)
      setMyId(socket.id ?? '')
      setReconnecting(false)

      // 再接続時: 前のルームに自動復帰を試みる
      if (savedRoomId.current && savedName.current) {
        socket.emit('join-room', savedRoomId.current!, savedName.current!, (_err: string | null) => {})
      }
    }
    function onDisconnect() {
      setConnected(false)
    }
    function onReconnectAttempt() {
      setReconnecting(true)
    }
    function onRoomUpdate(state: RoomState) {
      setRoomState(state)
      // ルームIDと名前を保存しておく
      if (state && socket.id) {
        const me = state.players.find(p => p.id === socket.id)
        if (me) {
          savedRoomId.current = state.id
          savedName.current = me.name
        }
      }
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('reconnect_attempt', onReconnectAttempt)
    socket.on('room-update', onRoomUpdate)

    if (!socket.connected) socket.connect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('reconnect_attempt', onReconnectAttempt)
      socket.off('room-update', onRoomUpdate)
    }
  }, [])

  const createRoom = useCallback((name: string): Promise<string> => {
    return new Promise((resolve) => {
      socket.emit('create-room', name, (roomId: string) => {
        savedName.current = name
        savedRoomId.current = roomId
        resolve(roomId)
      })
    })
  }, [])

  const joinRoom = useCallback((roomId: string, name: string): Promise<string | null> => {
    return new Promise((resolve) => {
      socket.emit('join-room', roomId, name, (error: string | null) => {
        if (!error) {
          savedName.current = name
          savedRoomId.current = roomId
        }
        resolve(error)
      })
    })
  }, [])

  const updateSettings = useCallback((settings: GameSettings) => { socket.emit('update-settings', settings) }, [])
  const startGame = useCallback(() => { socket.emit('start-game') }, [])
  const buzz = useCallback(() => { socket.emit('buzz') }, [])
  const submitAnswer = useCallback((answer: string) => { socket.emit('submit-answer', answer) }, [])

  const isHost = roomState?.hostId === myId

  return {
    roomState, myId, connected, reconnecting, isHost,
    createRoom, joinRoom, updateSettings, startGame, buzz, submitAnswer,
  }
}
