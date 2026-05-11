import { useState, useEffect, useRef } from 'react'
export function useTypewriter(text: string, active: boolean, speed = 120, startedAt?: number) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const pos = useRef(0)
  useEffect(() => {
    const skip = startedAt ? Math.floor((Date.now() - startedAt) / speed) : 0
    pos.current = Math.min(skip, text.length)
    setDisplayed(text.slice(0, pos.current))
    setDone(pos.current >= text.length)
  }, [text])
  useEffect(() => {
    if (!active || !text || pos.current >= text.length) return
    const id = setInterval(() => {
      pos.current++; setDisplayed(text.slice(0, pos.current))
      if (pos.current >= text.length) { clearInterval(id); setDone(true) }
    }, speed)
    return () => clearInterval(id)
  }, [text, active, speed])
  return { displayed, done }
}
