import { useMemo } from 'react'
import { quoteOne } from '../../shipping/engine'
import { candidateContainers } from '../../shipping/packaging'
import { usd } from '../../shipping/format'
import { CARRIERS, SERVICES } from '../../shipping/services'
import type { Quote, QuoteInput } from '../../shipping/types'

interface Row {
  containerId: string
  containerName: string
  kind: string
  materials: number
  grossLb: number
  dimLb: number
  best: Quote | null
  outer: string
  flags: string[]
}

export function PackagingMatrix({ input }: { input: QuoteInput }) {
  const rows = useMemo<Row[]>(() => {
    const parcels = candidateContainers(input.item, input.pack)
    return parcels.map((parcel) => {
      const quotes = SERVICES.map((s) => quoteOne(s, parcel, input)).filter(
        (q): q is Quote => q.available,
      )
      quotes.sort((a, b) => a.shipperCost - b.shipperCost)
      const dimDiv = 139
      const dim =
        (parcel.outer.length * parcel.outer.width * parcel.outer.height) / dimDiv
      return {
        containerId: parcel.container.id,
        containerName: parcel.container.name,
        kind: parcel.container.kind,
        materials: parcel.materialsTotal,
        grossLb: parcel.grossWeightLb,
        dimLb: Math.round(dim * 100) / 100,
        best: quotes[0] ?? null,
        outer: `${parcel.outer.length}×${parcel.outer.width}×${parcel.outer.height}″`,
        flags: parcel.flags,
      }
    })
  }, [input])

  const priced = rows.filter((r) => r.best)
  priced.sort((a, b) => (a.best!.shipperCost ?? 0) - (b.best!.shipperCost ?? 0))
  const unfit = rows.length === 0

  if (unfit) {
    return (
      <p className="note">
        Nothing in the catalogue fits {input.item.quantity} × {input.item.lengthIn}×
        {input.item.widthIn}×{input.item.heightIn}″ at {input.item.weightLb} lb with{' '}
        {input.pack.paddingIn}″ of padding. Reduce the padding, the quantity, or the item size.
      </p>
    )
  }

  const cheapest = priced[0]?.best?.shipperCost ?? 0
  const dearest = priced[priced.length - 1]?.best?.shipperCost ?? 1

  return (
    <>
      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th style={{ minWidth: 220 }}>Container</th>
              <th className="num">Outer</th>
              <th className="num">Materials</th>
              <th className="num">Gross</th>
              <th className="num">Dim wt</th>
              <th style={{ minWidth: 200 }}>Cheapest service</th>
              <th className="num">Ship cost</th>
              <th className="num">vs best</th>
            </tr>
          </thead>
          <tbody>
            {priced.map((r) => {
              const delta = r.best!.shipperCost - cheapest
              return (
                <tr key={r.containerId}>
                  <td>
                    {r.containerName}
                    {r.flags.length > 0 && (
                      <>
                        <br />
                        <span style={{ fontSize: 11, color: 'var(--warn)' }}>{r.flags[0]}</span>
                      </>
                    )}
                  </td>
                  <td className="num dim">{r.outer}</td>
                  <td className="num">{usd(r.materials)}</td>
                  <td className="num">{r.grossLb.toFixed(2)} lb</td>
                  <td className="num">
                    <span className={r.dimLb > r.grossLb ? '' : 'dim'}>{r.dimLb.toFixed(2)} lb</span>
                  </td>
                  <td>
                    <span
                      className="carrier-dot"
                      style={{ background: CARRIERS[r.best!.service.carrier].accent }}
                    />{' '}
                    {r.best!.service.name}
                  </td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {usd(r.best!.shipperCost)}
                  </td>
                  <td className="num">
                    {delta < 0.005 ? (
                      <span className="pill best">best</span>
                    ) : (
                      <span className="muted">+{usd(delta)}</span>
                    )}
                  </td>
                </tr>
              )
            })}
            {rows
              .filter((r) => !r.best)
              .map((r) => (
                <tr key={r.containerId} className="unavail">
                  <td>{r.containerName}</td>
                  <td colSpan={7} className="dim">
                    No service can carry this container to the destination
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      <p className="legend">
        <span>Spread across packaging choices: {usd(dearest - cheapest)}</span>
        <span>
          Dimensional weight uses the 139 in³/lb divisor published by DHL, UPS and FedEx.
        </span>
      </p>
    </>
  )
}
