import type { CarrierId, ServiceDef } from './types'

export const CARRIERS: Record<CarrierId, { name: string; accent: string }> = {
  usps: { name: 'USPS', accent: '#2f5bd8' },
  ups: { name: 'UPS', accent: '#8a6414' },
  fedex: { name: 'FedEx', accent: '#6b3fa0' },
  dhl: { name: 'DHL Express', accent: '#c8102e' },
}

/**
 * Dimensional divisors: 139 in³/lb for the integrators (published in each
 * carrier's 2026 guide). USPS international parcels price on actual weight,
 * so the divisor is 0.
 */
export const SERVICES: ServiceDef[] = [
  {
    id: 'usps-fcpis',
    carrier: 'usps',
    name: 'First-Class Package International',
    tier: 'postal',
    dimDivisor: 0,
    blurb: 'Cheapest way to move a small parcel abroad. Under 4 lb only, limited tracking.',
  },
  {
    id: 'usps-pmi',
    carrier: 'usps',
    name: 'Priority Mail International',
    tier: 'postal',
    dimDivisor: 0,
    blurb: 'Workhorse postal parcel service, 6-10 days, includes $200 indemnity on most groups.',
  },
  {
    id: 'usps-pmi-flat',
    carrier: 'usps',
    name: 'Priority Mail International Flat Rate',
    tier: 'postal',
    dimDivisor: 0,
    blurb: 'Fixed postage regardless of weight, if it fits the free USPS container.',
  },
  {
    id: 'usps-pmei',
    carrier: 'usps',
    name: 'Priority Mail Express International',
    tier: 'postal',
    dimDivisor: 0,
    blurb: 'Fastest postal option, 3-5 days to most of the world, date-certain to some.',
  },
  {
    id: 'ups-expedited',
    carrier: 'ups',
    name: 'UPS Worldwide Expedited',
    tier: 'economy',
    dimDivisor: 139,
    blurb: 'Day-definite economy air. Customs clearance included.',
  },
  {
    id: 'ups-saver',
    carrier: 'ups',
    name: 'UPS Worldwide Saver',
    tier: 'express',
    dimDivisor: 139,
    blurb: 'End-of-day express to 220+ countries.',
  },
  {
    id: 'ups-express',
    carrier: 'ups',
    name: 'UPS Worldwide Express',
    tier: 'express',
    dimDivisor: 139,
    blurb: 'Guaranteed by 10:30 a.m., 12:00 p.m. or 2:00 p.m.',
  },
  {
    id: 'fedex-economy',
    carrier: 'fedex',
    name: 'FedEx International Economy',
    tier: 'economy',
    dimDivisor: 139,
    blurb: 'Cost-effective air freight for less urgent shipments, 4-6 days.',
  },
  {
    id: 'fedex-priority',
    carrier: 'fedex',
    name: 'FedEx International Priority',
    tier: 'express',
    dimDivisor: 139,
    blurb: 'Typically 1-3 business days to major markets.',
  },
  {
    id: 'fedex-priority-express',
    carrier: 'fedex',
    name: 'FedEx International Priority Express',
    tier: 'express',
    dimDivisor: 139,
    blurb: 'Earliest available delivery commitment on the FedEx network.',
  },
  {
    id: 'dhl-worldwide',
    carrier: 'dhl',
    name: 'DHL Express Worldwide',
    tier: 'express',
    dimDivisor: 139,
    blurb: 'Deepest international network; usually the fastest to remote destinations.',
  },
]

export const SERVICE_BY_ID: Record<string, ServiceDef> = Object.fromEntries(
  SERVICES.map((s) => [s.id, s]),
)

/**
 * Default fuel surcharge percentages, August 2026. These float weekly with jet
 * fuel, so they are exposed as editable inputs.
 */
export const DEFAULT_FUEL_PCT: Record<CarrierId, number> = {
  dhl: 31.75,
  fedex: 38.5,
  ups: 37.0,
  usps: 0,
}
