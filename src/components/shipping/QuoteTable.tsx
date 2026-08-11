import { Fragment, useState } from 'react'
import { usd } from '../../shipping/format'
import { CARRIERS } from '../../shipping/services'
import type { CostLine, QuoteResult } from '../../shipping/types'


function Lines({ lines }: { lines: CostLine[] }) {
  return (
    <dl className="lines">
      {lines.map((l, i) => (
        <div key={i} style={{ display: 'contents' }}>
          <dt className={l.basis === 'estimate' ? 'est' : undefined}>{l.label}</dt>
          <dd>{usd(l.amount)}</dd>
          {l.detail && <div className="detail">{l.detail}</div>}
        </div>
      ))}
    </dl>
  )
}

interface Props {
  quotes: QuoteResult[]
  ddp: boolean
}

export function QuoteTable({ quotes, ddp }: Props) {
  const [open, setOpen] = useState<string | null>(null)

  const available = quotes.filter((q) => q.available)
  const sorted = [...quotes].sort((a, b) => {
    if (a.available && b.available) return a.shipperCost - b.shipperCost
    return a.available ? -1 : 1
  })
  const cheapest = available.length
    ? Math.min(...available.map((q) => (q.available ? q.shipperCost : Infinity)))
    : 0
  const dearest = available.length
    ? Math.max(...available.map((q) => (q.available ? q.shipperCost : 0)))
    : 1

  return (
    <div className="table-wrap">
      <table className="grid">
        <thead>
          <tr>
            <th style={{ minWidth: 260 }}>Service</th>
            <th className="num">Billable</th>
            <th className="num">Base rate</th>
            <th className="num">Ship cost</th>
            <th style={{ width: 90 }}>Relative</th>
            <th className="num">Duty + tax</th>
            <th className="num">Landed</th>
            <th className="num">Days</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((q) => {
            const key = q.service.id
            if (!q.available) {
              return (
                <tr key={key} className="unavail">
                  <td>
                    <span
                      className="carrier-dot"
                      style={{ background: CARRIERS[q.service.carrier].accent, opacity: 0.4 }}
                    />{' '}
                    {q.service.name}
                  </td>
                  <td colSpan={7} className="dim">
                    {q.reason}
                  </td>
                </tr>
              )
            }
            const isOpen = open === key
            const width = dearest > cheapest ? Math.max(5, (q.shipperCost / dearest) * 100) : 100
            return (
              <Fragment key={key}>
                <tr>
                  <td>
                    <button
                      type="button"
                      className="rowbtn"
                      aria-expanded={isOpen}
                      onClick={() => setOpen(isOpen ? null : key)}
                    >
                      <span
                        className="carrier-dot"
                        style={{ background: CARRIERS[q.service.carrier].accent }}
                      />
                      <span>
                        {q.service.name}
                        <br />
                        <span className="dim" style={{ fontSize: 11.5 }}>
                          {q.container.name}
                        </span>
                      </span>
                    </button>
                  </td>
                  <td className="num">
                    {q.billableWeightLb.toFixed(1)} lb
                    {q.dimWeightLb > q.grossWeightLb && (
                      <>
                        <br />
                        <span className="dim" style={{ fontSize: 11 }}>
                          dim {q.dimWeightLb.toFixed(1)}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="num">{usd(q.baseRate)}</td>
                  <td className="num" style={{ fontWeight: 600 }}>
                    {usd(q.shipperCost)}{' '}
                    {q.shipperCost === cheapest && <span className="pill best">best</span>}
                  </td>
                  <td>
                    <div className="bar" style={{ width: `${width}%` }} />
                  </td>
                  <td className="num">
                    {q.importCharges > 0 ? usd(q.importCharges) : <span className="dim">—</span>}
                    {q.importCharges > 0 && (
                      <>
                        <br />
                        <span className="dim" style={{ fontSize: 11 }}>
                          {ddp ? 'you pay' : 'recipient'}
                        </span>
                      </>
                    )}
                  </td>
                  <td className="num">{usd(q.landedCost)}</td>
                  <td className="num">{q.transitDays}</td>
                </tr>
                {isOpen && (
                  <tr className="breakdown">
                    <td colSpan={8}>
                      <div className="breakdown-inner">
                        <div>
                          <h4>Cost breakdown</h4>
                          <Lines lines={q.lines} />
                        </div>
                        <div>
                          <h4>Weight</h4>
                          <dl className="lines">
                            <dt>Gross shipped weight</dt>
                            <dd>{q.grossWeightLb.toFixed(2)} lb</dd>
                            <dt>Dimensional weight</dt>
                            <dd>
                              {q.service.dimDivisor
                                ? `${q.dimWeightLb.toFixed(2)} lb`
                                : 'not priced'}
                            </dd>
                            <dt>Billable</dt>
                            <dd>{q.billableWeightLb.toFixed(2)} lb</dd>
                          </dl>
                          <h4 style={{ marginTop: 14 }}>About</h4>
                          <p className="dim" style={{ margin: 0, fontSize: 12.5 }}>
                            {q.service.blurb}
                          </p>
                        </div>
                        {q.flags.length > 0 && (
                          <div>
                            <h4>Watch out</h4>
                            {q.flags.map((f, i) => (
                              <p className="note" key={i} style={{ marginTop: i ? 8 : 0 }}>
                                {f}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
