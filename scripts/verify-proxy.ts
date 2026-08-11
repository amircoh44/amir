/**
 * Exercises the rate proxy's request handling against a stubbed EasyPost.
 *
 * The point is the security boundary: an allowlisted origin, a required token,
 * input validation, and above all that the API key never appears in anything
 * the proxy sends back.
 */
import worker, { type Env } from '../services/rates-proxy/src/index'

const SECRET_KEY = 'EZTKtest_SUPERSECRET_KEY_DO_NOT_LEAK'

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(
    `${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`}`,
  )
}

const SHIPMENT = {
  id: 'shp_1',
  rates: [
    {
      id: 'rate_2',
      shipment_id: 'shp_1',
      carrier: 'UPS',
      service: 'UPSWorldwideExpedited',
      rate: '188.40',
      currency: 'USD',
      delivery_days: 4,
      delivery_date_guaranteed: true,
    },
    {
      id: 'rate_1',
      shipment_id: 'shp_1',
      carrier: 'USPS',
      service: 'PriorityMailInternational',
      rate: '61.20',
      currency: 'USD',
      delivery_days: 9,
      delivery_date_guaranteed: false,
    },
    {
      id: 'rate_3',
      shipment_id: 'shp_1',
      carrier: 'Sendle',
      service: 'SomeUnknownService',
      rate: '44.10',
      currency: 'USD',
      delivery_days: null,
      delivery_date_guaranteed: false,
    },
  ],
  messages: [{ carrier: 'FedEx', message: 'Account not configured' }],
}

let lastUpstream: { url: string; headers: Record<string, string>; body: unknown } | null = null

function stubFetch(response: unknown, status = 200) {
  globalThis.fetch = (async (url: string | URL | Request, init?: RequestInit) => {
    lastUpstream = {
      url: String(url),
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: init?.body ? JSON.parse(String(init.body)) : null,
    }
    return new Response(JSON.stringify(response), {
      status,
      headers: { 'content-type': 'application/json' },
    })
  }) as typeof fetch
}

const env = (over: Partial<Env> = {}): Env =>
  ({
    EASYPOST_API_KEY: SECRET_KEY,
    ALLOWED_ORIGINS: 'https://app.example.com,http://localhost:5173',
    ...over,
  }) as Env

const RATE_BODY = {
  to: { street1: '10 Downing St', city: 'London', zip: 'SW1A 2AA', country: 'GB' },
  parcel: { lengthIn: 10, widthIn: 8, heightIn: 3, weightOz: 26 },
  customs: {
    contentsType: 'merchandise',
    valueUsd: 120,
    description: 'Widget',
    quantity: 1,
    originCountry: 'US',
  },
}

function post(body: unknown, headers: Record<string, string> = {}, path = '/v1/rates') {
  return new Request(`https://proxy.test${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
}

async function main() {
  // --- CORS / origin -------------------------------------------------------
  const preflight = await worker.fetch(
    new Request('https://proxy.test/v1/rates', {
      method: 'OPTIONS',
      headers: { origin: 'https://app.example.com' },
    }),
    env(),
  )
  check('preflight returns 204', preflight.status, 204)
  check(
    'preflight echoes the allowed origin',
    preflight.headers.get('access-control-allow-origin'),
    'https://app.example.com',
  )

  stubFetch(SHIPMENT)
  const badOrigin = await worker.fetch(
    post(RATE_BODY, { origin: 'https://evil.example' }),
    env(),
  )
  check('disallowed origin is rejected', badOrigin.status, 403)

  // --- auth ----------------------------------------------------------------
  const noToken = await worker.fetch(post(RATE_BODY), env({ CLIENT_TOKEN: 'sekret' }))
  check('missing bearer token is rejected', noToken.status, 401)

  const wrongToken = await worker.fetch(
    post(RATE_BODY, { authorization: 'Bearer nope' }),
    env({ CLIENT_TOKEN: 'sekret' }),
  )
  check('wrong bearer token is rejected', wrongToken.status, 401)

  const rightToken = await worker.fetch(
    post(RATE_BODY, { authorization: 'Bearer sekret' }),
    env({ CLIENT_TOKEN: 'sekret' }),
  )
  check('correct bearer token is accepted', rightToken.status, 200)

  // --- config ---------------------------------------------------------------
  const unconfigured = await worker.fetch(post(RATE_BODY), env({ EASYPOST_API_KEY: '' }))
  check('missing API key fails closed', unconfigured.status, 500)

  // --- validation -----------------------------------------------------------
  const noStreet = await worker.fetch(post({ ...RATE_BODY, to: { country: 'GB' } }), env())
  check('address without street1 is rejected', noStreet.status, 400)

  const badCountry = await worker.fetch(
    post({ ...RATE_BODY, to: { street1: 'x', country: 'GBR' } }),
    env(),
  )
  check('non ISO-2 country is rejected', badCountry.status, 400)

  const badWeight = await worker.fetch(
    post({ ...RATE_BODY, parcel: { ...RATE_BODY.parcel, weightOz: 99999 } }),
    env(),
  )
  check('absurd parcel weight is rejected', badWeight.status, 400)

  const notFound = await worker.fetch(post(RATE_BODY, {}, '/v1/nope'), env())
  check('unknown route 404s', notFound.status, 404)

  const getReq = await worker.fetch(new Request('https://proxy.test/v1/rates'), env())
  check('GET is rejected', getReq.status, 405)

  // --- happy path -----------------------------------------------------------
  stubFetch(SHIPMENT)
  const ok = await worker.fetch(post(RATE_BODY, { origin: 'http://localhost:5173' }), env())
  check('valid request succeeds', ok.status, 200)
  const payload = (await ok.json()) as {
    rates: { serviceId?: string; carrier: string; amount: number; serviceName: string }[]
    messages: string[]
  }

  check('all rates returned', payload.rates.length, 3)
  check('rates sorted cheapest first', payload.rates[0].amount, 44.1)
  check('USPS service maps to our id', payload.rates.find((r) => r.amount === 61.2)?.serviceId, 'usps-pmi')
  check(
    'UPS service maps to our id',
    payload.rates.find((r) => r.amount === 188.4)?.serviceId,
    'ups-expedited',
  )
  check(
    'unknown carrier degrades gracefully',
    payload.rates.find((r) => r.amount === 44.1)?.carrier,
    'unknown',
  )
  check(
    'CamelCase service names are humanised',
    payload.rates.find((r) => r.amount === 61.2)?.serviceName,
    'Priority Mail International',
  )
  check('carrier messages pass through', payload.messages, ['FedEx: Account not configured'])

  // --- the key must never travel downstream ---------------------------------
  const raw = JSON.stringify(payload) + [...ok.headers.entries()].join(',')
  check('API key absent from response body and headers', raw.includes(SECRET_KEY), false)
  check(
    'API key absent from the whole serialised response',
    raw.toLowerCase().includes('eztktest'),
    false,
  )
  check(
    'API key IS sent upstream to EasyPost',
    (lastUpstream?.headers as Record<string, string>)?.authorization?.startsWith('Basic '),
    true,
  )
  check('upstream target is EasyPost', lastUpstream?.url, 'https://api.easypost.com/v2/shipments')

  // --- upstream failures are not leaked verbatim ----------------------------
  stubFetch({ error: { message: 'Invalid API key' } }, 401)
  const badKey = await worker.fetch(post(RATE_BODY), env())
  check('a 401 from EasyPost surfaces as a 500, not a 401', badKey.status, 500)

  stubFetch({ error: { message: 'Rate limit' } }, 429)
  const upstream429 = await worker.fetch(post(RATE_BODY), env())
  check('other upstream errors surface as 502', upstream429.status, 502)

  const malformed = await worker.fetch(
    new Request('https://proxy.test/v1/rates', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: '{not json',
    }),
    env(),
  )
  check('malformed JSON is rejected', malformed.status, 400)

  // --- address verification -------------------------------------------------
  stubFetch({
    street1: '10 DOWNING ST',
    city: 'LONDON',
    zip: 'SW1A 2AA',
    country: 'GB',
    verifications: { delivery: { success: true, errors: [] } },
  })
  const verified = await worker.fetch(post({ address: RATE_BODY.to }, {}, '/v1/address/verify'), env())
  const vpayload = (await verified.json()) as { valid: boolean; normalized?: { street1: string } }
  check('address verification succeeds', vpayload.valid, true)
  check('normalised address returned', vpayload.normalized?.street1, '10 DOWNING ST')

  stubFetch({
    street1: 'nowhere',
    country: 'GB',
    verifications: { delivery: { success: false, errors: [{ message: 'Address not found' }] } },
  })
  const unverified = await worker.fetch(
    post({ address: RATE_BODY.to }, {}, '/v1/address/verify'),
    env(),
  )
  const upayload = (await unverified.json()) as { valid: boolean; messages: string[] }
  check('failed verification reports invalid', upayload.valid, false)
  check('failure messages surface', upayload.messages, ['Address not found'])

  console.log(failures === 0 ? '\nALL PROXY CHECKS PASSED' : `\n${failures} PROXY CHECK(S) FAILED`)
  process.exit(failures === 0 ? 0 : 1)
}

void main()
