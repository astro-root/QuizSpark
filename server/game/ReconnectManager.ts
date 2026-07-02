// 切断からの再接続猶予（20秒）を管理する。
// ゲームの状態遷移そのものには関与せず、タイマーの発火のみを担当する。

export const RECONNECT_GRACE_MS = 20000

type FinalizeFn = (roomId: string, playerId: string) => void

class ReconnectManager {
  private timers = new Map<string, ReturnType<typeof setTimeout>>()
  private finalizeFn?: FinalizeFn

  setFinalizeFn(fn: FinalizeFn) {
    this.finalizeFn = fn
  }

  private key(roomId: string, playerId: string): string {
    return `${roomId}:${playerId}`
  }

  startGracePeriod(roomId: string, playerId: string) {
    this.cancelGracePeriod(roomId, playerId)
    const t = setTimeout(() => {
      this.timers.delete(this.key(roomId, playerId))
      this.finalizeFn?.(roomId, playerId)
    }, RECONNECT_GRACE_MS)
    this.timers.set(this.key(roomId, playerId), t)
  }

  cancelGracePeriod(roomId: string, playerId: string) {
    const k = this.key(roomId, playerId)
    const t = this.timers.get(k)
    if (t) {
      clearTimeout(t)
      this.timers.delete(k)
    }
  }

  clearRoom(roomId: string, playerIds: string[]) {
    playerIds.forEach((pid) => this.cancelGracePeriod(roomId, pid))
  }
}

export const reconnectManager = new ReconnectManager()
