import {
  EASYPOST_CARRIER_MAP,
  EASYPOST_SERVICE_MAP,
  type Address,
  type AddressCheckResult,
  type CarrierId,
  type LiveRate,
  type LiveRateResponse,
} from '@amir/shipping-core'

/**
 * Rate proxy.
 *
 * The only reason this service exists is that the EasyPost key must never
 * reach a client. A React Native bundle can be unzipped and a browser bundle
 * is plain text, so anything shipped to a device is public. The key lives here
 * as a Worker secret and nothing downstream ever sees it.
 */

export interface Env {
  /** `wrangler secret put EASYPOST_API_KEY` — never a var, never committed. */
  EASYPOST_API_KEY: string
  /** Comma-separated origin allowlist for browser callers. */
  ALLOWED_ORIGINS?: string
  /** Optional shared secret the apps send as a bearer token. */
  CLIENT_TOKEN?: string
  /** Optional KV namespace for response caching and rate limiting. */
  RATES_KV?: KVNamespace
  /** Origin address, as JSON. Defaults to the Denver warehouse below. */
  ORIGIN_ADDRESS?: string
}

const EASYPOST_BASE = 'https://api.easypost.com/v2'

const DEFAULT_ORIGIN: Address = {
  name: 'Warehouse',
  street1: '1600 Champa St',
  city: 'Denver',
  state: 'CO',
  zip: '80202',
  country: 'US',
}

/** Cache live quotes briefly — carrier rates do not move minute to minute. */
const RATE_CACHE_TTL_S = 300
/** Requests per IP per window, to stop an open proxy becoming someone's free API. */
const RATE_LIMIT = 60
const RATE_LIMIT_WINDOW_S = 60

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)

  // With no allowlist configured, fall back to same-origin only. Native apps
  // send no Origin header and are unaffected either way.
  const allow = origin && allowed.includes(origin) ? origin : allowed[0] ?? ''

  return {
    'access-control-allow-origin': allow,
    'access-control-allow-methods': 'POST, OPTIONS',
    'access-control-allow-headers': 'content-type, authorization',
    'access-control-max-age': '86400',
    vary: 'Origin',
  }
}

function json(body: unknown, status: number, headers: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', ...headers },
  })
}

function fail(message: string, status: number, headers: Record<string, string>): Response {
  return json({ error: message }, status, headers)
}

async function checkRateLimit(env: Env, ip: string): Promise<boolean> {
  if (!env.RATES_KV) return true
  const key = `rl:${ip}:${Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW_S)}`
  const current = Number((await env.RATES_KV.get(key)) ?? '0')
  if (current >= RATE_LIMIT) return false
  await env.RATES_KV.put(key, String(current + 1), { expirationTtl: RATE_LIMIT_WINDOW_S * 2 })
  return true
}

async function hashKey(value: unknown): Promise<string> {
  const data = new TextEncoder().encode(JSON.stringify(value))
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

// ---------------------------------------------------------------------------
// EasyPost
// ---------------------------------------------------------------------------

async function easypost<T>(env: Env, path: string, body: unknown): Promise<T> {
  const res = await fetch(`${EASYPOST_BASE}${path}`, {
    method: 'POST',
    headers: {
      // EasyPost uses HTTP Basic with the API key as the username.
      authorization: `Basic ${btoa(`${env.EASYPOST_API_KEY}:`)}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  const text = await res.text()
  const parsed: unknown = text ? JSON.parse(text) : null

  if (!res.ok) {
    const detail =
      parsed && typeof parsed === 'object' && 'error' in parsed
        ? ((parsed as { error: { message?: string } }).error?.message ?? 'unknown')
        : res.statusText
    // Surface the aggregator's complaint but never its request headers.
    throw new ProxyError(`EasyPost: ${detail}`, res.status === 401 ? 500 : 502)
  }
  return parsed as T
}

class ProxyError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ProxyError'
    this.status = status
  }
}

interface EasyPostRate {
  id: string
  shipment_id: string
  carrier: string
  service: string
  rate: string
  currency: string
  delivery_days: number | null
  delivery_date_guaranteed: boolean
}

interface EasyPostShipment {
  id: string
  rates: EasyPostRate[]
  messages?: { carrier: string; message: string }[]
}

function toAddressPayload(a: Address) {
  return {
    name: a.name,
    street1: a.street1,
    street2: a.street2,
    city: a.city,
    state: a.state,
    zip: a.zip,
    country: a.country,
    phone: a.phone,
  }
}

function normaliseRate(r: EasyPostRate): LiveRate {
  const carrier: CarrierId | 'unknown' = EASYPOST_CARRIER_MAP[r.carrier] ?? 'unknown'
  const serviceId = EASYPOST_SERVICE_MAP[r.service]
  return {
    carrier,
    carrierRaw: r.carrier,
    serviceRaw: r.service,
    // Split the CamelCase token into something a human can read.
    serviceName: r.service.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' '),
    serviceId,
    amount: Number.parseFloat(r.rate),
    currency: r.currency,
    deliveryDays: r.delivery_days,
    guaranteed: Boolean(r.delivery_date_guaranteed),
    rateId: r.id,
    shipmentId: r.shipment_id,
  }
}

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

function assertAddress(a: unknown, label: string): Address {
  if (!a || typeof a !== 'object') throw new ProxyError(`${label} is required`, 400)
  const addr = a as Record<string, unknown>
  if (typeof addr.country !== 'string' || addr.country.length !== 2) {
    throw new ProxyError(`${label}.country must be an ISO-2 code`, 400)
  }
  if (typeof addr.street1 !== 'string' || !addr.street1.trim()) {
    throw new ProxyError(`${label}.street1 is required`, 400)
  }
  return addr as unknown as Address
}

function assertNumber(v: unknown, label: string, min: number, max: number): number {
  const n = typeof v === 'number' ? v : Number.NaN
  if (!Number.isFinite(n) || n < min || n > max) {
    throw new ProxyError(`${label} must be a number between ${min} and ${max}`, 400)
  }
  return n
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

async function handleRates(req: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const body = (await req.json()) as Record<string, unknown>

  const to = assertAddress(body.to, 'to')
  const from = body.from ? assertAddress(body.from, 'from') : parseOrigin(env)
  const parcelIn = (body.parcel ?? {}) as Record<string, unknown>
  const customsIn = (body.customs ?? {}) as Record<string, unknown>

  const parcel = {
    length: assertNumber(parcelIn.lengthIn, 'parcel.lengthIn', 0.1, 108),
    width: assertNumber(parcelIn.widthIn, 'parcel.widthIn', 0.1, 108),
    height: assertNumber(parcelIn.heightIn, 'parcel.heightIn', 0.1, 108),
    weight: assertNumber(parcelIn.weightOz, 'parcel.weightOz', 0.1, 70 * 16),
  }

  const cacheKey = env.RATES_KV ? `rates:${await hashKey({ to, from, parcel, customsIn })}` : null
  if (cacheKey && env.RATES_KV) {
    const hit = await env.RATES_KV.get(cacheKey)
    if (hit) return json(JSON.parse(hit), 200, { ...cors, 'x-cache': 'hit' })
  }

  const customs_info = {
    contents_type: (customsIn.contentsType as string) ?? 'merchandise',
    customs_certify: true,
    customs_signer: 'Shipping Desk',
    restriction_type: 'none',
    eel_pfc: 'NOEEI 30.37(a)',
    customs_items: [
      {
        description: (customsIn.description as string) ?? 'General merchandise',
        quantity: assertNumber(customsIn.quantity ?? 1, 'customs.quantity', 1, 10_000),
        value: assertNumber(customsIn.valueUsd ?? 0, 'customs.valueUsd', 0, 1_000_000),
        weight: parcel.weight,
        origin_country: (customsIn.originCountry as string) ?? 'US',
        hs_tariff_number: customsIn.hsTariffNumber as string | undefined,
      },
    ],
  }

  const shipment = await easypost<EasyPostShipment>(env, '/shipments', {
    shipment: {
      to_address: toAddressPayload(to),
      from_address: toAddressPayload(from),
      parcel,
      customs_info,
    },
  })

  const payload: LiveRateResponse = {
    rates: (shipment.rates ?? []).map(normaliseRate).sort((a, b) => a.amount - b.amount),
    messages: (shipment.messages ?? []).map((m) => `${m.carrier}: ${m.message}`),
    fetchedAt: new Date().toISOString(),
  }

  if (cacheKey && env.RATES_KV) {
    await env.RATES_KV.put(cacheKey, JSON.stringify(payload), { expirationTtl: RATE_CACHE_TTL_S })
  }

  return json(payload, 200, { ...cors, 'x-cache': 'miss' })
}

interface EasyPostAddress {
  street1: string
  street2?: string
  city?: string
  state?: string
  zip?: string
  country: string
  latitude?: number
  longitude?: number
  verifications?: {
    delivery?: {
      success: boolean
      errors?: { message: string }[]
      details?: { latitude?: number; longitude?: number }
    }
  }
}

async function handleVerify(req: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  const body = (await req.json()) as Record<string, unknown>
  const address = assertAddress(body.address, 'address')

  const result = await easypost<EasyPostAddress>(env, '/addresses', {
    address: { ...toAddressPayload(address), verify: ['delivery'] },
  })

  const delivery = result.verifications?.delivery
  const payload: AddressCheckResult = {
    valid: Boolean(delivery?.success),
    normalized: delivery?.success
      ? {
          street1: result.street1,
          street2: result.street2,
          city: result.city,
          state: result.state,
          zip: result.zip,
          country: result.country,
        }
      : undefined,
    messages: (delivery?.errors ?? []).map((e) => e.message),
    latitude: result.latitude ?? delivery?.details?.latitude,
    longitude: result.longitude ?? delivery?.details?.longitude,
  }

  return json(payload, 200, cors)
}

function parseOrigin(env: Env): Address {
  if (!env.ORIGIN_ADDRESS) return DEFAULT_ORIGIN
  try {
    return JSON.parse(env.ORIGIN_ADDRESS) as Address
  } catch {
    return DEFAULT_ORIGIN
  }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const origin = req.headers.get('origin')
    const cors = corsHeaders(origin, env)

    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors })
    if (req.method !== 'POST') return fail('Method not allowed', 405, cors)

    if (!env.EASYPOST_API_KEY) {
      return fail('Proxy is not configured: EASYPOST_API_KEY is unset', 500, cors)
    }

    // A browser caller must come from an allowed origin. This is a speed bump,
    // not a wall — Origin is trivially forged outside a browser — so the real
    // protections are the shared token and the per-IP rate limit below.
    const allowed = (env.ALLOWED_ORIGINS ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
    if (origin && allowed.length > 0 && !allowed.includes(origin)) {
      return fail('Origin not allowed', 403, cors)
    }

    if (env.CLIENT_TOKEN) {
      const auth = req.headers.get('authorization')
      if (auth !== `Bearer ${env.CLIENT_TOKEN}`) return fail('Unauthorized', 401, cors)
    }

    const ip = req.headers.get('cf-connecting-ip') ?? 'unknown'
    if (!(await checkRateLimit(env, ip))) {
      return fail('Rate limit exceeded', 429, { ...cors, 'retry-after': String(RATE_LIMIT_WINDOW_S) })
    }

    const url = new URL(req.url)
    try {
      if (url.pathname === '/v1/rates') return await handleRates(req, env, cors)
      if (url.pathname === '/v1/address/verify') return await handleVerify(req, env, cors)
      return fail('Not found', 404, cors)
    } catch (err) {
      if (err instanceof ProxyError) return fail(err.message, err.status, cors)
      if (err instanceof SyntaxError) return fail('Malformed JSON body', 400, cors)
      return fail('Upstream request failed', 502, cors)
    }
  },
}
