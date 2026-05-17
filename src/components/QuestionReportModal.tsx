import { useState } from 'react'
import { apiFetch } from '../lib/api'
import { Flag, X } from 'lucide-react'

interface Props {
  questionId: number
  questionText: string
  onClose: () => void
}

const REASONS = ['事実の誤り', '誤字・脱字', '解答が不正確', 'その他']

export default function QuestionReportModal({ questionId, questionText, onClose }: Props) {
  const [reason, setReason] = useState('')
  const [detail, setDetail] = useState('')
  const [status, setStatus] = useState<'idle'|'sending'|'done'|'error'>('idle')

  async function submit() {
    if (!reason) return
    setStatus('sending')
    const body = detail ? `${reason}：${detail}` : reason
    const r = await apiFetch('/api/reports', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ questionId, reason: body }) })
    if (r.ok || r.status === 409) setStatus('done')
    else setStatus('error')
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 16, padding: 24, width: '100%', maxWidth: 400, display: 'flex', flexDirection: 'column', gap: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Flag size={18} color="var(--accent)" />
            <span style={{ fontWeight: 800, fontSize: 15 }}>問題を報告</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}><X size={20} /></button>
        </div>

        <p style={{ fontSize: 12, color: 'var(--muted)', background: 'var(--surface2)', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6 }}>
          {questionText.length > 60 ? questionText.slice(0, 60) + '…' : questionText}
        </p>

        {status === 'done' ? (
          <p style={{ textAlign: 'center', color: 'var(--correct)', fontWeight: 700, padding: '12px 0' }}>報告を受け付けました</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {REASONS.map(r => (
                <button key={r} onClick={() => setReason(r)}
                  style={{ padding: '10px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: '2px solid', cursor: 'pointer', textAlign: 'left',
                    borderColor: reason === r ? 'var(--accent)' : 'var(--border)',
                    background: reason === r ? 'color-mix(in srgb, var(--accent) 15%, transparent)' : 'var(--surface2)',
                    color: reason === r ? 'var(--accent)' : 'var(--text)' }}>
                  {r}
                </button>
              ))}
            </div>
            {reason === 'その他' && (
              <textarea value={detail} onChange={e => setDetail(e.target.value)} placeholder="詳細を入力" rows={3}
                style={{ padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 10, fontSize: 13, color: 'var(--text)', resize: 'vertical', fontFamily: 'inherit' }} />
            )}
            {status === 'error' && <p style={{ color: 'var(--wrong)', fontSize: 12 }}>送信に失敗しました</p>}
            <button onClick={submit} disabled={!reason || status === 'sending'}
              style={{ padding: '12px', borderRadius: 10, fontSize: 14, fontWeight: 800,
                background: reason ? 'linear-gradient(135deg,var(--accent),var(--accent2))' : 'var(--surface2)',
                color: reason ? '#fff' : 'var(--muted)', border: 'none', cursor: reason ? 'pointer' : 'default' }}>
              {status === 'sending' ? '送信中...' : '報告する'}
            </button>
          </>
        )}
      </div>
    </div>
  )
}
