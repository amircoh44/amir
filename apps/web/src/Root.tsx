import { lazy, Suspense, useState } from 'react'
import ShippingApp from './ShippingApp'

const VisualizerApp = lazy(() => import('./App'))

export default function Root() {
  const [app, setApp] = useState<'shipping' | 'visualizer'>('shipping')

  return (
    <>
      {app === 'shipping' ? (
        <ShippingApp />
      ) : (
        <Suspense fallback={null}>
          <VisualizerApp />
        </Suspense>
      )}
      <button
        type="button"
        onClick={() => setApp(app === 'shipping' ? 'visualizer' : 'shipping')}
        style={{
          position: 'fixed',
          right: 12,
          bottom: 12,
          zIndex: 50,
          background: '#171b25',
          color: '#8d97ab',
          border: '1px solid #262c3a',
          borderRadius: 6,
          padding: '5px 10px',
          font: '12px/1 system-ui, sans-serif',
          cursor: 'pointer',
        }}
      >
        {app === 'shipping' ? 'Audio visualizer →' : '← Shipping calculator'}
      </button>
    </>
  )
}
