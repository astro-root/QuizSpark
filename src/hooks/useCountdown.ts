import { useState, useEffect } from 'react'
export function useCountdown(timerEndsAt: number | null) {
  const [remaining, setRemaining] = useState(0)
  useEffect(() => {
    if (!timerEndsAt) { setRemaining(0); return }
    const update = () => setRemaining(Math.max(0, Math.floor((timerEndsAt - Date.now()) / 1000)))
    update(); const id = setInterval(update, 200); return () => clearInterval(id)
  }, [timerEndsAt])
  return remaining
}
