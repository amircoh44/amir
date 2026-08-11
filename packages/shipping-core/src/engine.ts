import { COUNTRY_BY_ISO, TRANSIT_DAYS } from './data/countries'
import { DHL_MULTIPLIERS, DHL_RATES, DHL_WEIGHTS } from './data/dhl'
import { FEDEX_RATES } from './data/fedex'
import {
  UPS_EXPEDITED_MIN_OVER_150,
  UPS_EXPEDITED_PER_LB,
  UPS_EXPEDITED_RATES,
  UPS_EXPEDITED_WEIGHTS,
  UPS_EXPRESS_MIN_OVER_150,
  UPS_EXPRESS_PER_LB,
  UPS_EXPRESS_RATES,
  UPS_EXPRESS_WEIGHTS,
  UPS_SAVER_MIN_OVER_150,
  UPS_SAVER_PER_LB,
  UPS_SAVER_RATES,
  UPS_SAVER_WEIGHTS,
} from './data/ups'
import {
  FCPIS_BANDS_OZ,
  FCPIS_RATES,
  PMEI_RATES,
  PMEI_WEIGHTS,
  PMI_RATES,
  PMI_WEIGHTS,
  USPS_FLAT_RATE,
} from './data/usps'
import { candidateContainers, round2, upsAdditionalHandling } from './packaging'
import { SERVICES } from './services'
import type {
  CarrierId,
  CostLine,
  Country,
  Dimensions,
  PackedParcel,
  Quote,
  QuoteInput,
  QuoteResult,
  ServiceDef,
} from './types'

export const ORIGIN = { city: 'Denver', state: 'CO', zip: '80202', country: 'United States' }

// ---------------------------------------------------------------------------
// Weight
// ---------------------------------------------------------------------------

export function dimWeightLb(outer: Dimensions, divisor: number): number {
  if (!divisor) return 0
  return (outer.length * outer.width * outer.height) / divisor
}

export function billableWeightLb(grossLb: number, outer: Dimensions, divisor: number): number {
  const dim = dimWeightLb(outer, divisor)
  const raw = Math.max(grossLb, dim)
  // The integrators bill whole pounds; USPS prices in ounces, so keep the detail.
  return divisor > 0 ? Math.max(1, Math.ceil(raw)) : Math.max(0.1, Math.ceil(raw * 10) / 10)
}

/** First tabulated weight break at or above `lb`. */
function stepIndex(weights: number[], lb: number): number {
  for (let i = 0; i < weights.length; i++) if (weights[i] >= lb - 1e-9) return i
  return -1
}

// ---------------------------------------------------------------------------
// Per-carrier base rates
// ---------------------------------------------------------------------------

function dhlBase(zone: string, lb: number): number | null {
  const table = DHL_RATES[zone as keyof typeof DHL_RATES]
  if (!table) return null
  const whole = Math.ceil(lb)
  const i = stepIndex(DHL_WEIGHTS, whole)
  if (i >= 0) return table[i]
  // Above 150 lb DHL multiplies the whole weight by a per-pound band rate.
  const band = DHL_MULTIPLIERS.find((m) => whole >= m.fromLb && whole <= m.toLb)
  if (!band) return null
  return round2(band.perLb[zone as keyof typeof band.perLb] * whole)
}

function upsBase(
  zone: string,
  lb: number,
  weights: number[],
  rates: Record<string, number[]>,
  perLb: Record<string, number>,
  minOver150: Record<string, number>,
): number | null {
  const table = rates[zone]
  if (!table) return null
  const whole = Math.ceil(lb)
  const i = stepIndex(weights, whole)
  if (i >= 0) return table[i]
  const rate = perLb[zone]
  if (!rate) return null
  return round2(Math.max(rate * whole, minOver150[zone] ?? 0))
}

function fedexBase(zone: string, lb: number, service: string): number | null {
  const svc = FEDEX_RATES[service]
  if (!svc) return null
  const table = svc[zone]
  if (!table) return null
  const whole = Math.ceil(lb)
  if (whole < 1) return table[0]
  if (whole > table.length) return null
  const v = table[whole - 1]
  return v > 0 ? v : null
}

function uspsWeightBased(
  group: number | undefined,
  maxLb: number | undefined,
  lb: number,
  weights: number[],
  rates: Record<string, number[]>,
): number | null {
  if (!group) return null
  const table = rates[String(group)]
  if (!table) return null
  const whole = Math.max(1, Math.ceil(lb))
  if (maxLb && whole > maxLb) return null
  const i = stepIndex(weights, whole)
  if (i < 0) return null
  const v = table[i]
  return v > 0 ? v : null
}

function uspsFcpis(group: number | undefined, lb: number): number | null {
  if (!group) return null
  const table = FCPIS_RATES[String(group)]
  if (!table) return null
  const oz = Math.ceil(lb * 16)
  const i = FCPIS_BANDS_OZ.findIndex((b) => oz <= b)
  if (i < 0) return null
  const v = table[i]
  return v > 0 ? v : null
}

// ---------------------------------------------------------------------------
// Surcharges. Published values come from each carrier's 2026 guide; anything
// modelled is flagged so the UI can show its provenance.
// ---------------------------------------------------------------------------

interface Accessorials {
  residential: CostLine | null
  signature: CostLine | null
  remote: (lb: number) => CostLine | null
  insurance: (value: number) => CostLine | null
  ddp: (fiscal: number) => CostLine | null
}

const ACCESSORIALS: Record<CarrierId, Accessorials> = {
  dhl: {
    residential: { label: 'Residential address', amount: 6.95, basis: 'published' },
    signature: { label: 'Direct signature', amount: 7.6, basis: 'published' },
    remote: (lb) => ({
      label: 'Remote area delivery',
      amount: round2(Math.max(50, lb * 0.5)),
      basis: 'published',
      detail: '$0.50 per lb, $50.00 minimum',
    }),
    insurance: (value) =>
      value <= 0
        ? null
        : {
            label: 'Shipment value protection',
            amount: round2(Math.max(11.55, Math.ceil(value / 100) * 1.65)),
            basis: 'published',
            detail: '$1.65 per $100 of cover, $11.55 minimum',
          },
    ddp: (fiscal) => ({
      label: 'Duty tax paid handling',
      amount: round2(Math.max(17, fiscal * 0.02)),
      basis: 'published',
      detail: '2% of duty and tax, $17.00 minimum',
    }),
  },
  ups: {
    residential: { label: 'Residential surcharge', amount: 6.55, basis: 'published' },
    signature: { label: 'Signature required', amount: 7.75, basis: 'estimate' },
    remote: (lb) => ({
      label: 'Remote area surcharge',
      amount: round2(Math.max(61, lb * 0.61)),
      basis: 'published',
      detail: 'Greater of $61.00 per shipment or $0.61 per lb',
    }),
    insurance: (value) =>
      value <= 100
        ? null
        : {
            label: 'Declared value',
            amount: round2(Math.max(3.9, Math.ceil((value - 100) / 100) * 1.65)),
            basis: 'estimate',
          },
    ddp: (fiscal) => ({
      label: 'Duty and tax forwarding',
      amount: round2(Math.max(17, fiscal * 0.025)),
      basis: 'estimate',
    }),
  },
  fedex: {
    residential: { label: 'Residential delivery', amount: 6.45, basis: 'estimate' },
    signature: { label: 'Direct signature', amount: 7.5, basis: 'estimate' },
    remote: (lb) => ({
      label: 'Out of delivery area',
      amount: round2(Math.max(55, lb * 0.55)),
      basis: 'estimate',
    }),
    insurance: (value) =>
      value <= 100
        ? null
        : {
            label: 'Declared value',
            amount: round2(Math.max(4.2, Math.ceil((value - 100) / 100) * 1.55)),
            basis: 'estimate',
          },
    ddp: (fiscal) => ({
      label: 'Duty and tax forwarding',
      amount: round2(Math.max(17, fiscal * 0.025)),
      basis: 'estimate',
    }),
  },
  usps: {
    residential: null,
    signature: { label: 'Return receipt', amount: 5.6, basis: 'estimate' },
    remote: () => null,
    insurance: (value) =>
      value <= 200
        ? null
        : {
            label: 'Additional insurance',
            amount: round2(3.05 + Math.ceil(Math.max(0, value - 200) / 100) * 1.45),
            basis: 'estimate',
          },
    ddp: () => null,
  },
}

// ---------------------------------------------------------------------------
// Duty and tax
// ---------------------------------------------------------------------------

export interface ImportCharges {
  duty: number
  tax: number
  total: number
  notes: string[]
}

export function importCharges(
  country: Country,
  goodsValue: number,
  freight: number,
  dutyRateOverride?: number,
): ImportCharges {
  const notes: string[] = []
  const dutyRate = (dutyRateOverride ?? country.duty ?? 0) / 100
  const vatRate = (country.vat ?? 0) / 100
  const dutyDm = country.dutyDeMinimis ?? 0
  const taxDm = country.taxDeMinimis ?? 0

  let duty = 0
  if (goodsValue > dutyDm) {
    duty = goodsValue * dutyRate
  } else if (dutyRate > 0) {
    notes.push(`Under the $${dutyDm.toFixed(0)} duty de minimis — no duty assessed.`)
  }

  // Most VAT regimes assess on CIF + duty; a handful use the goods value alone.
  let tax = 0
  if (goodsValue > taxDm) {
    tax = (goodsValue + freight + duty) * vatRate
  } else if (vatRate > 0) {
    notes.push(`Under the $${taxDm.toFixed(0)} tax de minimis — no import VAT.`)
  }

  return { duty: round2(duty), tax: round2(tax), total: round2(duty + tax), notes }
}

// ---------------------------------------------------------------------------
// Quoting
// ---------------------------------------------------------------------------

function baseRateFor(
  service: ServiceDef,
  country: Country,
  parcel: PackedParcel,
  billable: number,
): { rate: number | null; zone: string; reason?: string } {
  switch (service.id) {
    case 'dhl-worldwide': {
      if (!country.dhl) return { rate: null, zone: '—', reason: 'DHL does not publish a zone for this destination' }
      return { rate: dhlBase(country.dhl, billable), zone: `Zone ${country.dhl}` }
    }
    case 'ups-express': {
      if (!country.upsExpress) return { rate: null, zone: '—', reason: 'Service not offered to this destination' }
      return {
        rate: upsBase(country.upsExpress, billable, UPS_EXPRESS_WEIGHTS, UPS_EXPRESS_RATES, UPS_EXPRESS_PER_LB, UPS_EXPRESS_MIN_OVER_150),
        zone: `Zone ${country.upsExpress}`,
      }
    }
    case 'ups-saver': {
      if (!country.upsSaver) return { rate: null, zone: '—', reason: 'Service not offered to this destination' }
      return {
        rate: upsBase(country.upsSaver, billable, UPS_SAVER_WEIGHTS, UPS_SAVER_RATES, UPS_SAVER_PER_LB, UPS_SAVER_MIN_OVER_150),
        zone: `Zone ${country.upsSaver}`,
      }
    }
    case 'ups-expedited': {
      if (!country.upsExpedited) return { rate: null, zone: '—', reason: 'Service not offered to this destination' }
      return {
        rate: upsBase(country.upsExpedited, billable, UPS_EXPEDITED_WEIGHTS, UPS_EXPEDITED_RATES, UPS_EXPEDITED_PER_LB, UPS_EXPEDITED_MIN_OVER_150),
        zone: `Zone ${country.upsExpedited}`,
      }
    }
    case 'fedex-priority':
    case 'fedex-priority-express':
    case 'fedex-economy': {
      if (!country.fedex) return { rate: null, zone: '—', reason: 'FedEx does not publish a zone for this destination' }
      const key =
        service.id === 'fedex-priority'
          ? 'priority'
          : service.id === 'fedex-priority-express'
            ? 'priorityExpress'
            : 'economy'
      return { rate: fedexBase(country.fedex, billable, key), zone: `Zone ${country.fedex}` }
    }
    case 'usps-pmi': {
      if (!country.uspsPmi) return { rate: null, zone: '—', reason: 'No Priority Mail International service' }
      return {
        rate: uspsWeightBased(country.uspsPmi, country.uspsPmiMaxLb, parcel.grossWeightLb, PMI_WEIGHTS, PMI_RATES),
        zone: `Group ${country.uspsPmi}`,
      }
    }
    case 'usps-pmei': {
      if (!country.uspsPmei) return { rate: null, zone: '—', reason: 'No Priority Mail Express International service' }
      return {
        rate: uspsWeightBased(country.uspsPmei, country.uspsPmeiMaxLb, parcel.grossWeightLb, PMEI_WEIGHTS, PMEI_RATES),
        zone: `Group ${country.uspsPmei}`,
      }
    }
    case 'usps-fcpis': {
      if (!country.uspsFcpis) return { rate: null, zone: '—', reason: 'No First-Class Package International service' }
      return { rate: uspsFcpis(country.uspsFcpis, parcel.grossWeightLb), zone: `Group ${country.uspsFcpis}` }
    }
    case 'usps-pmi-flat': {
      const key = parcel.container.flatRateKey
      if (!key) return { rate: null, zone: '—', reason: 'Requires a USPS flat-rate container' }
      const flat = USPS_FLAT_RATE[key]
      const group = country.uspsPmiFlat
      if (!flat || !group) return { rate: null, zone: '—', reason: 'No flat-rate price group for this destination' }
      if (parcel.grossWeightLb > flat.maxLb) {
        return { rate: null, zone: '—', reason: `Over the ${flat.maxLb} lb flat-rate ceiling` }
      }
      return { rate: flat.prices[group - 1] ?? null, zone: `Flat-rate group ${group}` }
    }
    default:
      return { rate: null, zone: '—', reason: 'Unknown service' }
  }
}

function transitFor(service: ServiceDef, country: Country): number {
  const row = TRANSIT_DAYS[country.region] ?? [3, 5, 12]
  const base = service.tier === 'express' ? row[0] : service.tier === 'economy' ? row[1] : row[2]
  if (service.id === 'ups-express' || service.id === 'fedex-priority-express') return Math.max(1, base)
  if (service.id === 'usps-pmei') return Math.max(3, Math.round(row[2] * 0.45))
  if (service.id === 'usps-fcpis') return Math.round(row[2] * 1.3)
  return base
}

export function quoteOne(
  service: ServiceDef,
  parcel: PackedParcel,
  input: QuoteInput,
): QuoteResult {
  const { country, item } = input
  const container = parcel.container

  if (container.carrierLock && container.carrierLock !== service.carrier) {
    return { service, container, available: false, reason: `${container.name} is a USPS container` }
  }
  if (service.id === 'usps-pmi-flat' && !container.flatRateKey) {
    return { service, container, available: false, reason: 'Needs a USPS flat-rate container' }
  }
  if (container.flatRateKey && service.id !== 'usps-pmi-flat' && service.carrier === 'usps') {
    // A flat-rate box may also be priced by weight, which is sometimes cheaper.
  }
  if (country.restricted) {
    return { service, container, available: false, reason: 'Destination is embargoed or has no reliable service' }
  }

  const dim = dimWeightLb(parcel.outer, service.dimDivisor)
  const billable = billableWeightLb(parcel.grossWeightLb, parcel.outer, service.dimDivisor)
  const { rate, zone, reason } = baseRateFor(service, country, parcel, billable)
  if (rate === null) {
    return { service, container, available: false, reason: reason ?? 'No published rate at this weight' }
  }

  const lines: CostLine[] = [
    {
      label: `${service.name} base rate`,
      amount: rate,
      basis: 'published',
      detail: `${zone} · ${billable.toFixed(1)} lb billable`,
    },
  ]
  const flags = [...parcel.flags]

  const fuelPct = input.fuelPct[service.carrier] ?? 0
  if (fuelPct > 0) {
    lines.push({
      label: 'Fuel surcharge',
      amount: round2(rate * (fuelPct / 100)),
      basis: 'published',
      detail: `${fuelPct.toFixed(2)}% of transportation charges`,
    })
  }

  const acc = ACCESSORIALS[service.carrier]
  if (input.residential && acc.residential) lines.push(acc.residential)
  if (input.signature && acc.signature) lines.push(acc.signature)
  if (input.remoteArea) {
    const r = acc.remote(billable)
    if (r) lines.push(r)
  }
  if (input.insurance) {
    const ins = acc.insurance(item.valueUsd * Math.max(1, item.quantity))
    if (ins) lines.push(ins)
  }

  if (service.carrier === 'ups') {
    const ah = upsAdditionalHandling(container, parcel.outer, parcel.grossWeightLb)
    if (ah.length) {
      lines.push({
        label: 'Additional handling',
        amount: ah.some((r) => r.includes('weight')) ? 46.5 : 26.75,
        basis: 'published',
        detail: ah.join('; '),
      })
      flags.push(`UPS additional handling applies: ${ah.join('; ')}.`)
    }
  }

  const goodsValue = round2(item.valueUsd * Math.max(1, item.quantity))
  const freightSoFar = lines.reduce((s, l) => s + l.amount, 0)
  const imports = importCharges(country, goodsValue, freightSoFar, input.dutyRateOverride)

  if (input.ddp && imports.total > 0) {
    const fee = acc.ddp(imports.total)
    if (fee) lines.push(fee)
  }

  const packagingLines: CostLine[] = parcel.materials.map((m) => ({ ...m }))
  const shipperCost = round2(
    lines.reduce((s, l) => s + l.amount, 0) + parcel.materialsTotal + (input.ddp ? imports.total : 0),
  )
  const carrierOnly = round2(lines.reduce((s, l) => s + l.amount, 0))

  return {
    service,
    container,
    available: true,
    billableWeightLb: billable,
    grossWeightLb: parcel.grossWeightLb,
    dimWeightLb: round2(dim),
    baseRate: rate,
    lines: [
      ...lines,
      { label: 'Packaging materials', amount: parcel.materialsTotal, basis: 'estimate', detail: `${packagingLines.length} items` },
    ],
    shipperCost,
    importCharges: imports.total,
    landedCost: round2(carrierOnly + parcel.materialsTotal + imports.total + goodsValue),
    transitDays: transitFor(service, country),
    flags,
  }
}

/** Quote every service against every container the goods fit into. */
export function quoteAll(input: QuoteInput): QuoteResult[] {
  const parcels = candidateContainers(input.item, input.pack)
  const out: QuoteResult[] = []
  for (const parcel of parcels) {
    for (const service of SERVICES) {
      out.push(quoteOne(service, parcel, input))
    }
  }
  return out
}

/** Cheapest available quote per service, sorted by shipper cost. */
export function bestPerService(input: QuoteInput): QuoteResult[] {
  const all = quoteAll(input)
  const best = new Map<string, QuoteResult>()
  for (const q of all) {
    const prev = best.get(q.service.id)
    if (!q.available) {
      if (!prev) best.set(q.service.id, q)
      continue
    }
    if (!prev || !prev.available || q.shipperCost < prev.shipperCost) best.set(q.service.id, q)
  }
  return SERVICES.map((s) => best.get(s.id)).filter((q): q is QuoteResult => q !== undefined)
}

export function isQuote(q: QuoteResult): q is Quote {
  return q.available
}

/** Cheapest shipper cost to every destination, for the world comparison view. */
export function cheapestToEveryCountry(
  base: Omit<QuoteInput, 'country'>,
  countries: Country[],
): { country: Country; best: Quote | null }[] {
  return countries.map((country) => {
    const quotes = bestPerService({ ...base, country }).filter(isQuote)
    quotes.sort((a, b) => a.shipperCost - b.shipperCost)
    return { country, best: quotes[0] ?? null }
  })
}

export { COUNTRY_BY_ISO }
