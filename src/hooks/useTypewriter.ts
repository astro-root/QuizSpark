import { useState, useEffect, useRef } from 'react'

export function useTypewriter(text: string, active: boolean, speed = 120) {
  const [displayed, setDisplayed] = useState('')
  const [done, setDone] = useState(false)
  const pos = useRef(0)

  // textが変わったらリセット
  useEffect(() => {
    pos.current = 0
    setDisplayed('')
    setDone(false)
  }, [text])

  // activeになったら最初から1文字ずつ表示
  useEffect(() => {
    if (!active || !text) return
    if (pos.current >= text.length) { setDone(true); return }

    const id = setInterval(() => {
      pos.current++
      setDisplayed(text.slice(0, pos.current))
      if (pos.current >= text.length) {
        clearInterval(id)
        setDone(true)
      }
    }, speed)
    return () => clearInterval(id)
  }, [text, active, speed])

  return { displayed, done }
}
