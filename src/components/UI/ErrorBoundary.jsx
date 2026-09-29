import { Component } from 'react'

export function webglAvailable() {
  try {
    const c = document.createElement('canvas')
    return !!(window.WebGL2RenderingContext && c.getContext('webgl2')) || !!c.getContext('webgl')
  } catch {
    return false
  }
}

export function Fallback({ onRetry }) {
  return (
    <div className="fallback" role="alert">
      <p className="eyebrow">3D experience unavailable</p>
      <h2 className="fallback__title">The interactive keyboard could not be loaded.</h2>
      <p className="fallback__body">Your browser may have WebGL turned off, or the graphics driver stopped responding. Retry, or open the page in an up-to-date browser with hardware acceleration enabled.</p>
      <button className="btn btn--primary" onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}

export class ErrorBoundary extends Component {
  state = { error: null }
  static getDerivedStateFromError(error) {
    return { error }
  }
  componentDidCatch(error) {
    console.error('3D viewer failed:', error)
  }
  render() {
    if (this.state.error) return <Fallback onRetry={() => this.setState({ error: null })} />
    return this.props.children
  }
}
