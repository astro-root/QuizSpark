import { useEffect, useState, useCallback, useRef } from 'react'
import { socket } from '../lib/socket'
import type { RoomState, GameSettings, PublicRoom, PrematchInfo, RateResult } from '../types'

export function useSocket() {
  const [roomState, setRoomState] = useState<RoomState | null>(null)
  const [myId, setMyId] = useState<string>('')
  const [connected, setConnected] = useState(false)
  const [reconnecting, setReconnecting] = useState(false)
  const [publicRooms, setPublicRooms] = useState<PublicRoom[]>([])

  const [prematchInfo, setPrematchInfo] = useState<PrematchInfo | null>(null)
  const [rateResult, setRateResult] = useState<RateResult | null>(null)
  const savedRoomId = useRef<string | null>(null)
  const savedName = useRef<string | null>(null)

  useEffect(() => {
    function onConnect() {
      setConnected(true)
      setMyId(socket.id ?? '')
      setReconnecting(false)
      if (savedRoomId.current) {
        socket.emit('sync-state', savedRoomId.current)
      }
    }
    function onDisconnect() { setConnected(false) }
    function onReconnectAttempt() { setReconnecting(true) }
    function onRoomUpdate(state: RoomState) {
      setRoomState(state)
      if (state && socket.id) {
        const me = state.players.find(p => p.id === socket.id)
        if (me) {
          savedRoomId.current = state.id
          savedName.current = me.name
        }
      }
    }
    function onPublicRooms(rooms: PublicRoom[]) {
      setPublicRooms(rooms)
    }

    socket.on('connect', onConnect)
    socket.on('disconnect', onDisconnect)
    socket.on('reconnect_attempt', onReconnectAttempt)
    socket.on('room-update', onRoomUpdate)
    socket.on('public-rooms', onPublicRooms)
    socket.on('prematch-info', setPrematchInfo)
    socket.on('rate-result', setRateResult)
    const onStamp = (data: {fromId:string,fromName:string,stamp:string}) => {
      const id = Math.random().toString(36).slice(2)
      setStamps(prev => [...prev, { id, ...data }])
      setTimeout(() => setStamps(prev => prev.filter(s => s.id !== id)), 3000)
    }
    socket.on('stamp', onStamp)

    if (!socket.connected) socket.connect()

    return () => {
      socket.off('connect', onConnect)
      socket.off('disconnect', onDisconnect)
      socket.off('reconnect_attempt', onReconnectAttempt)
      socket.off('room-update', onRoomUpdate)
      socket.off('public-rooms', onPublicRooms)
      socket.off('prematch-info', setPrematchInfo)
      socket.off('rate-result', setRateResult)
    socket.off('stamp', onStamp)
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
  const resetGame = useCallback(() => { socket.emit('reset-game') }, [])
  const startGame = useCallback(() => { socket.emit('start-game') }, [])
  const buzz = useCallback(() => { socket.emit('buzz') }, [])
  const submitAnswer = useCallback((answer: string) => { socket.emit('submit-answer', answer) }, [])
  const joinQueue = useCallback(() => { socket.emit('join-queue') }, [])
  const syncState = useCallback((roomId: string) => { socket.emit('sync-state', roomId) }, [])
  const sendChat = useCallback((text: string) => { socket.emit('send-chat', text) }, [])
  const leaveQueue = useCallback(() => { socket.emit('leave-queue') }, [])

  const isHost = roomState?.hostId === myId

  return {
    roomState, myId, connected, reconnecting, isHost, publicRooms, prematchInfo, rateResult, setPrematchInfo, setRateResult,
    createRoom, joinRoom, updateSettings, resetGame, startGame, buzz, submitAnswer,
    joinQueue, leaveQueue, sendChat, syncState, socket,
  }
}
