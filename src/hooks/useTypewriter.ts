import { useState, useEffect, useRef } from 'react'

export function useTypewriter(text: string, active: boolean, speed = 120, startedAt?: number) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const pos = useRef(0)
  const doneRef = useRef(false)

  // textが変わったらリセット
  useEffect(() => {
    pos.current = 0
    doneRef.current = false
    setDisplayed('')
    setDone(false)
  }, [text])

  // activeになった時点でelapsed計算してアニメ開始
  useEffect(() => {
    if (!active || !text || doneRef.current) return

    // showQNum分の時間をスキップ
    const elapsed = startedAt ? Math.max(0, Date.now() - startedAt) : 0
    const skip = Math.floor(elapsed / speed)
    if (skip > pos.current) {
      pos.current = Math.min(skip, text.length)
      setDisplayed(text.slice(0, pos.current))
    }

    if (pos.current >= text.length) {
      doneRef.current = true; setDone(true); return
    }

    const id = setInterval(() => {
      pos.current++
      setDisplayed(text.slice(0, pos.current))
      if (pos.current >= text.length) {
        clearInterval(id); doneRef.current = true; setDone(true)
      }
    }, speed)
    return () => clearInterval(id)
  }, [text, active, speed, startedAt])

  return { displayed, done }
}
