import { useMemo, useState } from 'react'
import { ControlPanel } from './components/shipping/ControlPanel'
import { PackagingMatrix } from './components/shipping/PackagingMatrix'
import { QuoteTable } from './components/shipping/QuoteTable'
import { WorldTable } from './components/shipping/WorldTable'
import { COUNTRY_BY_ISO } from './shipping/data/countries'
import { ORIGIN, bestPerService, importCharges, isQuote } from './shipping/engine'
import { usd } from './shipping/format'
import { CARRIERS } from './shipping/services'
import { DEFAULT_SETTINGS, type Settings } from './shipping/settings'
import type { QuoteInput } from './shipping/types'
import './shipping/shipping.css'

type Tab = 'quotes' | 'packaging' | 'world'

const TABS: { id: Tab; label: string }[] = [
  { id: 'quotes', label: 'Rate comparison' },
  { id: 'packaging', label: 'Packaging & bagging' },
  { id: 'world', label: 'Worldwide' },
]

export default function ShippingApp() {
  const [tab, setTab] = useState<Tab>('quotes')
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)

  const country = COUNTRY_BY_ISO[settings.destination]

  const input = useMemo<QuoteInput>(
    () => ({
      country,
      item: settings.item,
      pack: settings.pack,
      fuelPct: settings.fuelPct,
      residential: settings.residential,
      signature: settings.signature,
      insurance: settings.insurance,
      remoteArea: settings.remoteArea,
      ddp: settings.ddp,
      dutyRateOverride: settings.dutyRateOverride ?? undefined,
    }),
    [country, settings],
  )

  const quotes = useMemo(() => bestPerService(input), [input])
  const priced = quotes.filter(isQuote)
  const best = priced.slice().sort((a, b) => a.shipperCost - b.shipperCost)[0]
  const fastest = priced.slice().sort((a, b) => a.transitDays - b.transitDays || a.shipperCost - b.shipperCost)[0]

  const goodsValue = settings.item.valueUsd * Math.max(1, settings.item.quantity)
  const duties = importCharges(
    country,
    goodsValue,
    best?.shipperCost ?? 0,
    settings.dutyRateOverride ?? undefined,
  )

  return (
    <div className="ship">
      <header className="ship-top">
        <h1 className="ship-title">Denver → the world</h1>
        <p className="ship-route">
          <strong>
            {ORIGIN.city}, {ORIGIN.state} {ORIGIN.zip}
          </strong>{' '}
          → <strong>{country?.name ?? '—'}</strong> · 4 carriers · 11 services · published 2026
          tariffs
        </p>
        <div className="ship-top-right">
          {Object.entries(CARRIERS).map(([id, c]) => (
            <span key={id} className="pill">
              <span className="carrier-dot" style={{ background: c.accent, marginRight: 6 }} />
              {c.name}
            </span>
          ))}
        </div>
      </header>

      <nav className="ship-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            className="ship-tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="ship-body">
        <aside className="ship-side">
          <ControlPanel settings={settings} onChange={setSettings} showDestination={tab !== 'world'} />
        </aside>

        <main className="ship-main">
          {tab === 'quotes' && (
            <>
              <div className="headline">
                <div>
                  <h2>{country?.name}</h2>
                  <p>
                    {priced.length} of {quotes.length} services can carry this parcel.
                    {country?.dhl && ` DHL zone ${country.dhl}.`}
                    {country?.uspsPmi && ` USPS group ${country.uspsPmi}.`}
                  </p>
                </div>
              </div>

              {best && fastest && (
                <dl className="winner">
                  <div>
                    <dt>Cheapest to ship</dt>
                    <dd>
                      {usd(best.shipperCost)}
                      <small>
                        {best.service.name} · {best.container.name}
                      </small>
                    </dd>
                  </div>
                  <div>
                    <dt>Fastest</dt>
                    <dd>
                      {fastest.transitDays} days
                      <small>
                        {fastest.service.name} · {usd(fastest.shipperCost)}
                      </small>
                    </dd>
                  </div>
                  <div>
                    <dt>Duty + import VAT</dt>
                    <dd>
                      {usd(duties.total)}
                      <small>
                        on {usd(goodsValue)} of goods
                        {country?.vat ? ` · ${country.vat}% VAT` : ''}
                      </small>
                    </dd>
                  </div>
                  <div>
                    <dt>Landed cost</dt>
                    <dd>
                      {usd(best.landedCost)}
                      <small>goods + freight + packaging + duty</small>
                    </dd>
                  </div>
                </dl>
              )}

              <QuoteTable quotes={quotes} ddp={settings.ddp} />

              {duties.notes.map((n, i) => (
                <p className="note info" key={i}>
                  {n}
                </p>
              ))}
              {country?.restricted && (
                <p className="note">
                  {country.name} is embargoed or has no reliable commercial parcel service from the
                  United States. Check current OFAC and carrier restrictions before quoting.
                </p>
              )}
            </>
          )}

          {tab === 'packaging' && (
            <>
              <div className="headline">
                <div>
                  <h2>How the box changes the bill</h2>
                  <p>
                    Every container your goods physically fit into, priced against the cheapest
                    service that will carry it to {country?.name}.
                  </p>
                </div>
              </div>
              <PackagingMatrix input={input} />
              <p className="note info">
                Above roughly 166 in³ per pound, carriers bill the box rather than the goods.
                A poly mailer that collapses around the item can beat a box by more than the box
                itself costs — but UPS charges additional handling on any soft pack over 18″ × 14″ ×
                6″, which usually wipes out the saving.
              </p>
            </>
          )}

          {tab === 'world' && (
            <WorldTable
              base={input}
              onPick={(iso) => {
                setSettings({ ...settings, destination: iso })
                setTab('quotes')
              }}
            />
          )}

          <div className="footnote">
            <p>
              <strong>Where the numbers come from.</strong> Base rates, zone maps and the surcharges
              marked as published are transcribed from the DHL Express Service &amp; Rate Guide 2026
              (United States), the UPS Rate and Service Guide 2026 U.S. 48 daily list rates, USPS
              Notice 123 effective 12 July 2026, and FedEx Standard List Rates effective 5 January
              2026. Rates are list/retail prices from a Denver origin; negotiated account rates will
              be lower.
            </p>
            <p>
              Packaging prices, transit days, duty rates and any line marked <em>est</em> in a cost
              breakdown are modelled estimates. Fuel surcharges float weekly — the defaults are
              the August 2026 indices and are editable in the sidebar. Duty and VAT are indicative
              only; the actual charge depends on the HS classification of the goods.
            </p>
          </div>
        </main>
      </div>
    </div>
  )
}
