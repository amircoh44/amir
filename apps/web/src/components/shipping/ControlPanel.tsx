import { COUNTRIES, DEFAULT_SETTINGS, type CarrierId, type Country, type Item, type PackOptions, type Settings } from '@amir/shipping-core'

const byRegion = COUNTRIES.reduce<Record<string, Country[]>>((acc, c) => {
  ;(acc[c.region] ??= []).push(c)
  return acc
}, {})

interface Props {
  settings: Settings
  onChange: (next: Settings) => void
  showDestination: boolean
}

export function ControlPanel({ settings, onChange, showDestination }: Props) {
  const set = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    onChange({ ...settings, [key]: value })
  const setItem = <K extends keyof Item>(key: K, value: Item[K]) =>
    onChange({ ...settings, item: { ...settings.item, [key]: value } })
  const setPack = <K extends keyof PackOptions>(key: K, value: PackOptions[K]) =>
    onChange({ ...settings, pack: { ...settings.pack, [key]: value } })

  const country = COUNTRIES.find((c) => c.iso === settings.destination)

  return (
    <div>
      {showDestination && (
        <fieldset className="fieldset">
          <legend>Destination</legend>
          <label className="field">
            <span>Country or territory</span>
            <select
              value={settings.destination}
              onChange={(e) => set('destination', e.target.value)}
            >
              {Object.keys(byRegion)
                .sort()
                .map((region) => (
                  <optgroup key={region} label={region}>
                    {byRegion[region]
                      .slice()
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((c) => (
                        <option key={c.iso} value={c.iso}>
                          {c.name}
                          {c.restricted ? ' — restricted' : ''}
                        </option>
                      ))}
                  </optgroup>
                ))}
            </select>
          </label>
          {country && (
            <p className="dim" style={{ margin: '2px 0 0', fontSize: 12 }}>
              {country.region}
              {country.vat ? ` · ${country.vat}% VAT` : ''}
              {country.duty != null ? ` · ~${country.duty}% duty` : ''}
            </p>
          )}
        </fieldset>
      )}

      <fieldset className="fieldset">
        <legend>What you are shipping</legend>
        <div className="row row-3">
          <label className="field">
            <span>Length in</span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={settings.item.lengthIn}
              onChange={(e) => setItem('lengthIn', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Width in</span>
            <input
              type="number"
              min={0.5}
              step={0.5}
              value={settings.item.widthIn}
              onChange={(e) => setItem('widthIn', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Height in</span>
            <input
              type="number"
              min={0.25}
              step={0.25}
              value={settings.item.heightIn}
              onChange={(e) => setItem('heightIn', Number(e.target.value))}
            />
          </label>
        </div>
        <div className="row row-3">
          <label className="field">
            <span>Weight lb</span>
            <input
              type="number"
              min={0.05}
              step={0.05}
              value={settings.item.weightLb}
              onChange={(e) => setItem('weightLb', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Value USD</span>
            <input
              type="number"
              min={0}
              step={5}
              value={settings.item.valueUsd}
              onChange={(e) => setItem('valueUsd', Number(e.target.value))}
            />
          </label>
          <label className="field">
            <span>Quantity</span>
            <input
              type="number"
              min={1}
              step={1}
              value={settings.item.quantity}
              onChange={(e) => setItem('quantity', Math.max(1, Math.round(Number(e.target.value))))}
            />
          </label>
        </div>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.item.fragile}
            onChange={(e) => setItem('fragile', e.target.checked)}
          />
          <span>
            Fragile
            <small>Forces bubble wrap and flags unpadded packaging</small>
          </span>
        </label>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Bagging &amp; packing</legend>
        <label className="field">
          <span>Padding per side — {settings.pack.paddingIn}″</span>
          <input
            type="range"
            min={0}
            max={3}
            step={0.25}
            value={settings.pack.paddingIn}
            onChange={(e) => setPack('paddingIn', Number(e.target.value))}
            style={{ width: '100%', accentColor: 'var(--accent)' }}
          />
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.pack.useVoidFill}
            onChange={(e) => setPack('useVoidFill', e.target.checked)}
          />
          <span>
            Fill voids with kraft paper
            <small>Adds material cost and a little weight</small>
          </span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.pack.bubbleWrap}
            onChange={(e) => setPack('bubbleWrap', e.target.checked)}
          />
          <span>Wrap the item in bubble</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.pack.customsPaperwork}
            onChange={(e) => setPack('customsPaperwork', e.target.checked)}
          />
          <span>
            Printed commercial invoice
            <small>Required for non-document exports</small>
          </span>
        </label>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Services &amp; surcharges</legend>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.residential}
            onChange={(e) => set('residential', e.target.checked)}
          />
          <span>Residential delivery address</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.signature}
            onChange={(e) => set('signature', e.target.checked)}
          />
          <span>Signature on delivery</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.insurance}
            onChange={(e) => set('insurance', e.target.checked)}
          />
          <span>Insure the declared value</span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.remoteArea}
            onChange={(e) => set('remoteArea', e.target.checked)}
          />
          <span>
            Remote or extended area
            <small>Applies the carrier's remote-area charge</small>
          </span>
        </label>
        <label className="check">
          <input
            type="checkbox"
            checked={settings.ddp}
            onChange={(e) => set('ddp', e.target.checked)}
          />
          <span>
            Pay duty and tax at origin (DDP)
            <small>Otherwise the recipient is billed on arrival</small>
          </span>
        </label>
      </fieldset>

      <fieldset className="fieldset">
        <legend>Rate assumptions</legend>
        <div className="row row-2">
          {(['dhl', 'ups', 'fedex'] as CarrierId[]).map((c) => (
            <label className="field" key={c}>
              <span>{c.toUpperCase()} fuel %</span>
              <input
                type="number"
                min={0}
                max={100}
                step={0.25}
                value={settings.fuelPct[c]}
                onChange={(e) =>
                  set('fuelPct', { ...settings.fuelPct, [c]: Number(e.target.value) })
                }
              />
            </label>
          ))}
          <label className="field">
            <span>Duty rate % override</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.5}
              placeholder={country?.duty != null ? String(country.duty) : 'auto'}
              value={settings.dutyRateOverride ?? ''}
              onChange={(e) =>
                set('dutyRateOverride', e.target.value === '' ? null : Number(e.target.value))
              }
            />
          </label>
        </div>
        <button
          type="button"
          className="btn btn-ghost"
          style={{ marginTop: 6 }}
          onClick={() => onChange({ ...DEFAULT_SETTINGS, destination: settings.destination })}
        >
          Reset to defaults
        </button>
      </fieldset>
    </div>
  )
}
