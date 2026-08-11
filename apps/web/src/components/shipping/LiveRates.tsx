import { useMemo, useState } from 'react'
import { CARRIERS, usd, type Address, type QuoteInput } from '@amir/shipping-core'
import { createShippingClient, useAddressCheck, useRates } from '@amir/shipping-client'

const PROXY_URL = import.meta.env.VITE_RATES_PROXY_URL as string | undefined
const CLIENT_TOKEN = import.meta.env.VITE_RATES_PROXY_TOKEN as string | undefined

interface Props {
  input: QuoteInput
}

export function LiveRates({ input }: Props) {
  const [street1, setStreet1] = useState('')
  const [city, setCity] = useState('')
  const [zip, setZip] = useState('')

  const client = useMemo(
    () =>
      PROXY_URL
        ? createShippingClient({ baseUrl: PROXY_URL, authToken: CLIENT_TOKEN || undefined })
        : null,
    [],
  )

  const to: Address | null = street1.trim()
    ? {
        street1: street1.trim(),
        city: city.trim() || undefined,
        zip: zip.trim() || undefined,
        country: input.country.iso,
      }
    : null

  const { rows, loading, error, messages, offline } = useRates(client, input, to)
  const address = useAddressCheck(client, to)

  if (!client) {
    return (
      <>
        <div className="headline">
          <div>
            <h2>Live account rates</h2>
            <p>Not configured yet.</p>
          </div>
        </div>
        <p className="note info">
          Set <code>VITE_RATES_PROXY_URL</code> in <code>apps/web/.env.local</code> to the deployed
          rate proxy, then restart the dev server. The EasyPost key stays on the proxy — it is never
          sent to the browser, and anything in this bundle is public.
        </p>
      </>
    )
  }

  const priced = rows.filter((r) => r.live || r.published)

  return (
    <>
      <div className="headline">
        <div>
          <h2>Live account rates</h2>
          <p>
            Your negotiated pricing from EasyPost, next to the published list rate for the same
            service.
          </p>
        </div>
        {loading && <span className="pill">fetching…</span>}
      </div>

      <fieldset className="fieldset">
        <legend>Deliver to ({input.country.name})</legend>
        <div className="row row-3">
          <label className="field">
            <span>Street</span>
            <input
              type="text"
              value={street1}
              placeholder="10 Downing St"
              onChange={(e) => setStreet1(e.target.value)}
            />
          </label>
          <label className="field">
            <span>City</span>
            <input type="text" value={city} onChange={(e) => setCity(e.target.value)} />
          </label>
          <label className="field">
            <span>Postal code</span>
            <input type="text" value={zip} onChange={(e) => setZip(e.target.value)} />
          </label>
        </div>
        {address.loading && <p className="dim" style={{ margin: 0, fontSize: 12 }}>Verifying…</p>}
        {address.data?.valid && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--good)' }}>
            Address verified ·{' '}
            {[address.data.normalized?.street1, address.data.normalized?.city, address.data.normalized?.zip]
              .filter(Boolean)
              .join(', ')}
          </p>
        )}
        {address.data && !address.data.valid && (
          <p style={{ margin: 0, fontSize: 12, color: 'var(--warn)' }}>
            {address.data.messages.join(' · ') || 'Address could not be verified'}
          </p>
        )}
      </fieldset>

      {offline && (
        <p className="note info">
          Enter a street address to fetch live rates. Published tariffs are shown until then.
        </p>
      )}
      {error && (
        <p className="note">
          Live lookup failed: {error}. The published tariff figures below are unaffected.
        </p>
      )}
      {messages.map((m) => (
        <p className="note" key={m}>
          {m}
        </p>
      ))}

      <div className="table-wrap">
        <table className="grid">
          <thead>
            <tr>
              <th style={{ minWidth: 240 }}>Service</th>
              <th className="num">Published list</th>
              <th className="num">Your rate</th>
              <th className="num">Difference</th>
              <th className="num">Days</th>
            </tr>
          </thead>
          <tbody>
            {priced.map((row) => (
              <tr key={row.service.id}>
                <td>
                  <span
                    className="carrier-dot"
                    style={{ background: CARRIERS[row.service.carrier]?.accent ?? 'var(--dim)' }}
                  />{' '}
                  {row.service.name}
                </td>
                <td className="num">
                  {row.published ? usd(row.published.baseRate) : <span className="dim">—</span>}
                </td>
                <td className="num" style={{ fontWeight: 600 }}>
                  {row.live ? usd(row.live.amount) : <span className="dim">not quoted</span>}
                </td>
                <td className="num">
                  {row.savingVsList == null ? (
                    <span className="dim">—</span>
                  ) : (
                    <span style={{ color: row.savingVsList > 0 ? 'var(--good)' : 'var(--warn)' }}>
                      {row.savingVsList > 0 ? '−' : '+'}
                      {usd(Math.abs(row.savingVsList))}
                    </span>
                  )}
                </td>
                <td className="num">
                  {row.live?.deliveryDays ?? row.published?.transitDays ?? (
                    <span className="dim">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="note info">
        Published figures are retail list rates from the carriers' 2026 tariffs. Live figures are
        commercial rates on your EasyPost account, so a negative difference is expected — that gap
        is what the account is worth. Neither number includes packaging or duty; the rate comparison
        tab models those.
      </p>
    </>
  )
}
