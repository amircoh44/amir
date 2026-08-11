import { useMemo, useState } from 'react'
import { CARRIERS, COUNTRIES, cheapestToEveryCountry, usd, type QuoteInput } from '@amir/shipping-core'

type SortKey = 'name' | 'region' | 'cost' | 'landed' | 'days'

interface Props {
  base: Omit<QuoteInput, 'country'>
  onPick: (iso: string) => void
}

export function WorldTable({ base, onPick }: Props) {
  const [sort, setSort] = useState<SortKey>('cost')
  const [region, setRegion] = useState('all')
  const [query, setQuery] = useState('')

  const rows = useMemo(() => cheapestToEveryCountry(base, COUNTRIES), [base])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out = rows.filter(
      (r) =>
        (region === 'all' || r.country.region === region) &&
        (!q || r.country.name.toLowerCase().includes(q) || r.country.iso.toLowerCase() === q),
    )
    out.sort((a, b) => {
      if (sort === 'name') return a.country.name.localeCompare(b.country.name)
      if (sort === 'region')
        return a.country.region.localeCompare(b.country.region) || a.country.name.localeCompare(b.country.name)
      const av = a.best ? (sort === 'days' ? a.best.transitDays : sort === 'landed' ? a.best.landedCost : a.best.shipperCost) : Infinity
      const bv = b.best ? (sort === 'days' ? b.best.transitDays : sort === 'landed' ? b.best.landedCost : b.best.shipperCost) : Infinity
      return av - bv
    })
    return out
  }, [rows, sort, region, query])

  const priced = filtered.filter((r) => r.best)
  const max = priced.length ? Math.max(...priced.map((r) => r.best!.shipperCost)) : 1

  const exportCsv = () => {
    const header = [
      'ISO', 'Country', 'Region', 'Service', 'Carrier', 'Container',
      'BillableLb', 'BaseRate', 'ShipperCost', 'DutyAndTax', 'LandedCost', 'TransitDays',
    ]
    const lines = [header.join(',')]
    for (const r of filtered) {
      if (!r.best) {
        lines.push([r.country.iso, `"${r.country.name}"`, `"${r.country.region}"`, 'NO SERVICE', '', '', '', '', '', '', '', ''].join(','))
        continue
      }
      const b = r.best
      lines.push([
        r.country.iso,
        `"${r.country.name}"`,
        `"${r.country.region}"`,
        `"${b.service.name}"`,
        CARRIERS[b.service.carrier].name,
        `"${b.container.name}"`,
        b.billableWeightLb.toFixed(2),
        b.baseRate.toFixed(2),
        b.shipperCost.toFixed(2),
        b.importCharges.toFixed(2),
        b.landedCost.toFixed(2),
        String(b.transitDays),
      ].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'denver-worldwide-shipping-costs.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  const regions = Array.from(new Set(COUNTRIES.map((c) => c.region))).sort()
  const cheapest = priced[0]
  const median = priced.length
    ? [...priced].sort((a, b) => a.best!.shipperCost - b.best!.shipperCost)[Math.floor(priced.length / 2)]
    : null

  return (
    <>
      <div className="headline">
        <div>
          <h2>Every destination, cheapest option</h2>
          <p>
            {priced.length} of {filtered.length} destinations priced for the parcel you configured.
          </p>
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <input
            type="text"
            placeholder="Search country"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: 160 }}
          />
          <select value={region} onChange={(e) => setRegion(e.target.value)} style={{ width: 170 }}>
            <option value="all">All regions</option>
            {regions.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)} style={{ width: 150 }}>
            <option value="cost">Sort by ship cost</option>
            <option value="landed">Sort by landed cost</option>
            <option value="days">Sort by transit days</option>
            <option value="name">Sort by name</option>
            <option value="region">Sort by region</option>
          </select>
          <button type="button" className="btn" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      {cheapest && median && (
        <dl className="winner">
          <div>
            <dt>Cheapest destination</dt>
            <dd>
              {usd(cheapest.best!.shipperCost)}
              <small>
                {cheapest.country.name} · {cheapest.best!.service.name}
              </small>
            </dd>
          </div>
          <div>
            <dt>Median destination</dt>
            <dd>
              {usd(median.best!.shipperCost)}
              <small>{median.country.name}</small>
            </dd>
          </div>
          <div>
            <dt>Dearest destination</dt>
            <dd>
              {usd(max)}
              <small>{priced.find((r) => r.best!.shipperCost === max)?.country.name}</small>
            </dd>
          </div>
          <div>
            <dt>No service</dt>
            <dd>
              {filtered.length - priced.length}
              <small>embargoed or unserved destinations</small>
            </dd>
          </div>
        </dl>
      )}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th style={{ minWidth: 190 }}>Destination</th>
              <th>Region</th>
              <th style={{ minWidth: 210 }}>Cheapest service</th>
              <th className="num">Ship cost</th>
              <th style={{ width: 110 }}>Relative</th>
              <th className="num">Duty + tax</th>
              <th className="num">Landed</th>
              <th className="num">Days</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.country.iso}>
                <td>
                  <button type="button" className="btn btn-ghost" style={{ padding: 0 }} onClick={() => onPick(r.country.iso)}>
                    {r.country.name}
                  </button>
                </td>
                <td className="dim">{r.country.region}</td>
                {r.best ? (
                  <>
                    <td>
                      <span
                        className="carrier-dot"
                        style={{ background: CARRIERS[r.best.service.carrier].accent }}
                      />{' '}
                      {r.best.service.name}
                    </td>
                    <td className="num" style={{ fontWeight: 600 }}>
                      {usd(r.best.shipperCost)}
                    </td>
                    <td>
                      <div className="bar" style={{ width: `${Math.max(5, (r.best.shipperCost / max) * 100)}%` }} />
                    </td>
                    <td className="num">
                      {r.best.importCharges > 0 ? usd(r.best.importCharges) : <span className="dim">—</span>}
                    </td>
                    <td className="num">{usd(r.best.landedCost)}</td>
                    <td className="num">{r.best.transitDays}</td>
                  </>
                ) : (
                  <td colSpan={6} className="dim">
                    {r.country.restricted ? 'Embargoed or no reliable service' : 'No published rate for this parcel'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
