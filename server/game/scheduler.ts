/**
 * 期限が来たらコールバックを呼ぶ仕組みの抽象。
 *
 * 現行(常駐サーバー): InMemoryScheduler(setTimeout)。
 * サーバーレス移行後: スケジューラは使わず(または外部キュー)、クライアントからの tick リクエストが
 * 同じ GameManager.advanceIfDue() を呼ぶ。判断は常に「状態に保存された期限」で行うので、
 * どの経路から何回呼ばれても安全(冪等)。
 */
export interface Scheduler {
  /** roomId の期限(epoch ms)で onDue を呼ぶ。既存の予約は置き換える */
  schedule(roomId: string, atMs: number): void
  cancel(roomId: string): void
}

export class InMemoryScheduler implements Scheduler {
  private timers = new Map<string, ReturnType<typeof setTimeout>>()

  constructor(private readonly onDue: (roomId: string) => void) {}

  schedule(roomId: string, atMs: number): void {
    this.cancel(roomId)
    const delay = Math.max(0, atMs - Date.now())
    const t = setTimeout(() => {
      this.timers.delete(roomId)
      try { this.onDue(roomId) } catch (e) { console.error('[Scheduler] onDue failed:', e) }
    }, delay)
    this.timers.set(roomId, t)
  }

  cancel(roomId: string): void {
    const t = this.timers.get(roomId)
    if (t) { clearTimeout(t); this.timers.delete(roomId) }
  }
}
