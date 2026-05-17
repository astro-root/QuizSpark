import { Component, ReactNode } from 'react'
import { useLocation } from 'react-router-dom'

interface Props { children: ReactNode }
interface State { hasError: boolean; error: Error | null }

class ErrorBoundaryInner extends Component<Props & { locationKey: string }, State> {
  constructor(props: any) {
    super(props)
    this.state = { hasError: false, error: null }
  }
  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }
  componentDidUpdate(prev: any) {
    if (prev.locationKey !== this.props.locationKey && this.state.hasError) {
      this.setState({ hasError: false, error: null })
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, background: 'var(--bg)' }}>
          <p style={{ fontSize: 48 }}>⚡</p>
          <p style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>エラーが発生しました</p>
          <p style={{ color: 'var(--muted)', fontSize: 13 }}>{this.state.error?.message}</p>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => this.setState({ hasError: false, error: null })}
              style={{ padding: '12px 28px', borderRadius: 10, background: 'var(--surface2)', color: 'var(--text)', fontWeight: 700, fontSize: 15, border: '1px solid var(--border)', cursor: 'pointer' }}>
              もう一度試す
            </button>
            <button onClick={() => { this.setState({ hasError: false, error: null }); window.location.href = '/' }}
              style={{ padding: '12px 28px', borderRadius: 10, background: 'var(--accent)', color: '#fff', fontWeight: 700, fontSize: 15, border: 'none', cursor: 'pointer' }}>
              トップに戻る
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default function ErrorBoundary({ children }: Props) {
  const location = useLocation()
  return <ErrorBoundaryInner locationKey={location.key}>{children}</ErrorBoundaryInner>
}
