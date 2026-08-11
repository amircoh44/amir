import { SERVICE_BY_ID, SERVICES } from './services'
import type { CarrierId, Quote, QuoteResult, ServiceDef } from './types'

/**
 * Wire contract between the rate proxy and the apps.
 *
 * The proxy normalises whatever the aggregator returns into these shapes, so
 * swapping EasyPost for Shippo is a change in `services/rates-proxy` alone and
 * never reaches the clients.
 */

export interface LiveRate {
  /** Our carrier id when we recognise it, otherwise the raw aggregator string. */
  carrier: CarrierId | 'unknown'
  /** Aggregator's own labels, kept for debugging and for buying a label later. */
  carrierRaw: string
  serviceRaw: string
  serviceName: string
  /** Our ServiceDef id when the service maps onto one we already model. */
  serviceId?: string
  amount: number
  currency: string
  deliveryDays: number | null
  guaranteed: boolean
  /** Aggregator identifiers — required to purchase postage against this quote. */
  rateId: string
  shipmentId: string
}

export interface LiveRateResponse {
  rates: LiveRate[]
  /** Aggregator warnings, e.g. a carrier that declined to quote. */
  messages: string[]
  fetchedAt: string
}

export interface Address {
  name?: string
  street1: string
  street2?: string
  city?: string
  state?: string
  zip?: string
  /** ISO-2 country code. */
  country: string
  phone?: string
}

export interface AddressCheckResult {
  valid: boolean
  /** Carrier-standardised address, present when `valid`. */
  normalized?: Address
  messages: string[]
  latitude?: number
  longitude?: number
}

/**
 * EasyPost service tokens we already model, so a live quote can be lined up
 * against the published rate for the same service.
 */
export const EASYPOST_SERVICE_MAP: Record<string, string> = {
  // USPS
  FirstClassPackageInternationalService: 'usps-fcpis',
  PriorityMailInternational: 'usps-pmi',
  PriorityMailExpressInternational: 'usps-pmei',
  // UPS
  UPSSaver: 'ups-saver',
  UPSWorldwideSaver: 'ups-saver',
  UPSWorldwideExpedited: 'ups-expedited',
  Expedited: 'ups-expedited',
  UPSWorldwideExpress: 'ups-express',
  UPSWorldwideExpressPlus: 'ups-express',
  // FedEx
  INTERNATIONAL_ECONOMY: 'fedex-economy',
  INTERNATIONAL_PRIORITY: 'fedex-priority',
  FEDEX_INTERNATIONAL_PRIORITY_EXPRESS: 'fedex-priority-express',
  // DHL
  ExpressWorldwide: 'dhl-worldwide',
  ExpressWorldwideNonDoc: 'dhl-worldwide',
}

export const EASYPOST_CARRIER_MAP: Record<string, CarrierId> = {
  USPS: 'usps',
  UPS: 'ups',
  UPSDAP: 'ups',
  FedEx: 'fedex',
  FedExDefault: 'fedex',
  DHLExpress: 'dhl',
}

export interface ReconciledRow {
  service: ServiceDef
  /** List price from the carrier's published tariff. */
  published: Quote | null
  /** What the aggregator actually quoted, when it quoted this service. */
  live: LiveRate | null
  /** published - live, positive when the live rate is the cheaper of the two. */
  savingVsList: number | null
}

/**
 * Line published quotes up against live ones service by service.
 *
 * Live rates come back at commercial/negotiated pricing while the tables in
 * this package are retail list prices, so the two are not interchangeable —
 * showing them side by side is the point.
 */
export function reconcile(published: QuoteResult[], live: LiveRate[]): ReconciledRow[] {
  const liveByService = new Map<string, LiveRate>()
  const unmatched: LiveRate[] = []
  for (const rate of live) {
    if (rate.serviceId && !liveByService.has(rate.serviceId)) {
      liveByService.set(rate.serviceId, rate)
    } else {
      unmatched.push(rate)
    }
  }

  const rows: ReconciledRow[] = SERVICES.map((service) => {
    const pub = published.find((q) => q.service.id === service.id)
    const publishedQuote = pub && pub.available ? pub : null
    const liveRate = liveByService.get(service.id) ?? null
    return {
      service,
      published: publishedQuote,
      live: liveRate,
      savingVsList:
        publishedQuote && liveRate
          ? Math.round((publishedQuote.baseRate - liveRate.amount) * 100) / 100
          : null,
    }
  })

  // Services the aggregator offers that this package does not model.
  for (const rate of unmatched) {
    rows.push({
      service: {
        id: `live:${rate.carrierRaw}:${rate.serviceRaw}`,
        carrier: rate.carrier === 'unknown' ? 'usps' : rate.carrier,
        name: rate.serviceName,
        tier: 'economy',
        dimDivisor: 139,
        blurb: `Offered by ${rate.carrierRaw}; not in the published tables bundled here.`,
      },
      published: null,
      live: rate,
      savingVsList: null,
    })
  }

  return rows.filter((r) => r.published || r.live)
}

export function serviceForLiveRate(rate: LiveRate): ServiceDef | undefined {
  return rate.serviceId ? SERVICE_BY_ID[rate.serviceId] : undefined
}
