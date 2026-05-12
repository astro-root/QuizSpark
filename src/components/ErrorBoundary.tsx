import { Component, ReactNode } from 'react'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, background: 'var(--bg)' }}>
          <p style={{ fontSize: 48 }}>⚡</p>
          <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>エラーが発生しました</p>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>{this.state.error?.message}</p>
          <button
            onClick={() => window.location.href = '/'}
            style={{ padding: '12px 28px', borderRadius: 10, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none' }}>
            トップに戻る
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
