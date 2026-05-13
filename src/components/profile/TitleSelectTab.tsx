import { useState } from 'react'
import { useAuth } from '../../context/AuthContext'
import { TITLES, getUnlockedTitles, getTitleById } from '../../lib/titles'
import { apiFetch } from '../../lib/api'

export default function TitleSelectTab({ stats }: { stats: { rate: number; total: number; wins: number; correct: number } }) {
  const { user, updateProfile } = useAuth()
  const unlocked = getUnlockedTitles(stats)
  const current = getTitleById((user as any)?.titleId)
  const [selected, setSelected] = useState(current.id)
  const [saving, setSaving] = useState(false)
  const [ok, setOk] = useState(false)

  async function save() {
    setSaving(true)
    await apiFetch('/auth/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: user!.name, titleId: selected }) })
    await (updateProfile as any)(user!.name, (user as any).bio, (user as any).username, selected)
    setSaving(false); setOk(true); setTimeout(() => setOk(false), 2000)
  }

  const categories = [
    { key: 'rank', label: '🏆 段位' },
    { key: 'achievement', label: '⭐ 実績' },
    { key: 'fun', label: '😄 ネタ' },
  ] as const

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: 'var(--surface)', borderRadius: 14, padding: '14px 16px', border: '1px solid var(--border)', textAlign: 'center' }}>
        <p style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 6 }}>現在の称号</p>
        <p style={{ fontSize: 18, fontWeight: 900, color: 'var(--accent)' }}>{current.label}</p>
      </div>

      {categories.map(cat => (
        <div key={cat.key}>
          <p style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', marginBottom: 10 }}>{cat.label}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TITLES.filter(t => t.category === cat.key).map(t => {
              const isUnlocked = unlocked.some(u => u.id === t.id)
              const isSelected = selected === t.id
              return (
                <button key={t.id} disabled={!isUnlocked} onClick={() => setSelected(t.id)}
                  style={{ padding: '12px 16px', borderRadius: 12, border: `1.5px solid ${isSelected ? 'var(--accent)' : 'var(--border)'}`,
                    background: isSelected ? 'rgba(56,189,248,0.08)' : 'var(--surface)',
                    opacity: isUnlocked ? 1 : 0.35, cursor: isUnlocked ? 'pointer' : 'not-allowed',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 14, fontWeight: 700, color: isSelected ? 'var(--accent)' : 'var(--text)' }}>{t.label}</p>
                    <p style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{t.description}</p>
                  </div>
                  {isSelected && <span style={{ fontSize: 16 }}>✓</span>}
                  {!isUnlocked && <span style={{ fontSize: 11, color: 'var(--muted)' }}>🔒</span>}
                </button>
              )
            })}
          </div>
        </div>
      ))}

      <button onClick={save} disabled={saving}
        style={{ padding: '14px', borderRadius: 12, fontSize: 15, fontWeight: 700,
          background: 'var(--accent)', color: '#fff', border: 'none', cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
        {ok ? '保存しました ✓' : saving ? '保存中...' : '称号を設定する'}
      </button>
    </div>
  )
}
