import { COUNTRY_BY_ISO } from '../src/shipping/data/countries'
import { DHL_RATES } from '../src/shipping/data/dhl'
import { FEDEX_RATES } from '../src/shipping/data/fedex'
import { UPS_SAVER_RATES } from '../src/shipping/data/ups'
import { PMI_RATES } from '../src/shipping/data/usps'
import { bestPerService, importCharges, isQuote, quoteOne } from '../src/shipping/engine'
import { pack } from '../src/shipping/packaging'
import { CONTAINER_BY_ID } from '../src/shipping/packaging'
import { SERVICE_BY_ID } from '../src/shipping/services'
import type { QuoteInput } from '../src/shipping/types'

let failures = 0
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected)
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  actual=${JSON.stringify(actual)} expected=${JSON.stringify(expected)}`)
}
function near(label: string, actual: number, expected: number, tol = 0.011) {
  const ok = Math.abs(actual - expected) <= tol
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}  actual=${actual} expected=${expected}`)
}

// ---- raw tariff spot checks against the printed guides ----------------------
near('DHL zone C @ 1 lb (guide p.26)', DHL_RATES.C[0], 148.69)
near('DHL zone N @ 150 lb (guide p.29)', DHL_RATES.N[149], 5401.46)
near('DHL zone A @ 25 lb (guide p.27)', DHL_RATES.A[24], 344.05)
near('USPS PMI group 1 (Canada) @ 1 lb (Notice 123 p.41)', PMI_RATES['1'][0], 43.55)
near('USPS PMI group 1 @ 2 lb', PMI_RATES['1'][1], 47.05)
near('FedEx zone C International Priority @ 1 lb (list rates p.42)', FEDEX_RATES.priority.C[0], 129.72)
near('FedEx zone C International Economy @ 1 lb', FEDEX_RATES.economy.C[0], 106.48)
near('UPS Saver zone 401 @ 1 lb (daily rates p.120)', UPS_SAVER_RATES['401'][0], 148.45)
near('UPS Saver zone 421 @ 1 lb', UPS_SAVER_RATES['421'][0], 139.31)

// ---- zone assignments ------------------------------------------------------
check('UK -> DHL zone C', COUNTRY_BY_ISO.GB.dhl, 'C')
check('UK -> UPS Saver 401', COUNTRY_BY_ISO.GB.upsSaver, '401')
check('UK -> USPS PMI group 20', COUNTRY_BY_ISO.GB.uspsPmi, 20)
check('Japan -> DHL zone F', COUNTRY_BY_ISO.JP.dhl, 'F')
check('Japan -> UPS Expedited 613', COUNTRY_BY_ISO.JP.upsExpedited, '613')
check('Canada -> DHL zone A', COUNTRY_BY_ISO.CA.dhl, 'A')
check('Canada -> USPS PMI group 1', COUNTRY_BY_ISO.CA.uspsPmi, 1)
check('Mexico -> DHL zone B', COUNTRY_BY_ISO.MX.dhl, 'B')
check('Mexico -> FedEx zone C', COUNTRY_BY_ISO.MX.fedex, 'C')
check('Australia -> DHL zone I', COUNTRY_BY_ISO.AU.dhl, 'I')

// ---- coverage --------------------------------------------------------------
const all = Object.values(COUNTRY_BY_ISO)
const withDhl = all.filter((c) => c.dhl).length
const withUps = all.filter((c) => c.upsSaver).length
const withUsps = all.filter((c) => c.uspsPmi).length
const withFedex = all.filter((c) => c.fedex).length
console.log(`\ncountries=${all.length} dhl=${withDhl} ups=${withUps} usps=${withUsps} fedex=${withFedex}`)
check('every country has at least one carrier', all.filter((c) => !c.dhl && !c.upsSaver && !c.uspsPmi && !c.uspsFcpis && !c.fedex).map((c) => c.iso), [])

// ---- engine ---------------------------------------------------------------
const baseInput = (iso: string, over: Partial<QuoteInput> = {}): QuoteInput => ({
  country: COUNTRY_BY_ISO[iso],
  item: { lengthIn: 9, widthIn: 6, heightIn: 2, weightLb: 1.5, valueUsd: 120, quantity: 1, fragile: false },
  pack: { paddingIn: 1, useVoidFill: true, bubbleWrap: false, customsPaperwork: true },
  fuelPct: { dhl: 31.75, ups: 37, fedex: 38.5, usps: 0 },
  residential: true,
  signature: false,
  insurance: false,
  remoteArea: false,
  ddp: false,
  ...over,
})

const gb = bestPerService(baseInput('GB'))
console.log('\nUK quotes:')
for (const q of gb) {
  if (isQuote(q)) {
    console.log(`  ${q.service.name.padEnd(42)} ${q.container.name.padEnd(30)} base ${q.baseRate.toFixed(2).padStart(8)}  ship ${q.shipperCost.toFixed(2).padStart(8)}  billable ${q.billableWeightLb}`)
  } else {
    console.log(`  ${q.service.name.padEnd(42)} unavailable: ${q.reason}`)
  }
}
check('UK has priced services', gb.filter(isQuote).length > 5, true)

// DHL to UK, 1.5 lb goods in a poly mailer -> billable should round to 2 lb
const parcel = pack(baseInput('GB').item, CONTAINER_BY_ID['poly-14x19'], baseInput('GB').pack)!
const dhlQuote = quoteOne(SERVICE_BY_ID['dhl-worldwide'], parcel, baseInput('GB'))
if (isQuote(dhlQuote)) {
  near('DHL UK poly mailer billed on dim weight', dhlQuote.billableWeightLb, 6, 0.001)
  near('DHL UK poly mailer base = zone C 6 lb rate', dhlQuote.baseRate, DHL_RATES.C[5])
  near('DHL UK fuel line', dhlQuote.lines[1].amount, Math.round(DHL_RATES.C[5] * 0.3175 * 100) / 100)
} else {
  check('DHL UK quote available', false, true)
}

// Dimensional weight must dominate for a light item in a big box
const bulky = baseInput('GB', {
  item: { lengthIn: 18, widthIn: 14, heightIn: 10, weightLb: 3, valueUsd: 200, quantity: 1, fragile: false },
})
const bigBox = pack(bulky.item, CONTAINER_BY_ID['box-20x16x12'], bulky.pack)!
const bulkyQuote = quoteOne(SERVICE_BY_ID['dhl-worldwide'], bigBox, bulky)
if (isQuote(bulkyQuote)) {
  const expectedDim = (20.5 * 16.5 * 12.5) / 139
  near('bulky dim weight', bulkyQuote.dimWeightLb, Math.round(expectedDim * 100) / 100, 0.02)
  check('billable follows dim weight', bulkyQuote.billableWeightLb > bulkyQuote.grossWeightLb, true)
} else {
  check('bulky quote available', false, true)
}

// USPS flat rate must only price with a USPS container
const flatParcel = pack(baseInput('GB').item, CONTAINER_BY_ID['usps-medium-box'], baseInput('GB').pack)!
const flatQ = quoteOne(SERVICE_BY_ID['usps-pmi-flat'], flatParcel, baseInput('GB'))
if (isQuote(flatQ)) {
  near('UK PMI medium flat rate box (flat group 5)', flatQ.baseRate, 95.95)
} else {
  check('flat rate available to UK', false, true)
}
const flatWrong = quoteOne(SERVICE_BY_ID['usps-pmi-flat'], parcel, baseInput('GB'))
check('flat rate rejects a poly mailer', flatWrong.available, false)
const uspsBoxOnDhl = quoteOne(SERVICE_BY_ID['dhl-worldwide'], flatParcel, baseInput('GB'))
check('DHL rejects a USPS flat-rate container', uspsBoxOnDhl.available, false)

// Duty / VAT
const duty = importCharges(COUNTRY_BY_ISO.GB, 120, 40)
near('UK duty on $120 (under GBP135 relief)', duty.duty, 0)
near('UK VAT on $120 goods + $40 freight', duty.tax, (120 + 40) * 0.2)
const dutyBig = importCharges(COUNTRY_BY_ISO.GB, 500, 40)
near('UK duty on $500 at 4%', dutyBig.duty, 20)
near('UK VAT on $500 + $40 + $20', dutyBig.tax, (500 + 40 + 20) * 0.2)
const au = importCharges(COUNTRY_BY_ISO.AU, 300, 50)
near('AU under the AUD1000 de minimis: no duty', au.duty, 0)
near('AU under the de minimis: no GST', au.tax, 0)

// Restricted destinations
const cu = bestPerService(baseInput('CU'))
check('Cuba is blocked', cu.every((q) => !q.available), true)

// Every non-restricted country must produce at least one quote
const unpriced: string[] = []
for (const c of all) {
  if (c.restricted) continue
  const qs = bestPerService(baseInput(c.iso)).filter(isQuote)
  if (qs.length === 0) unpriced.push(c.iso)
}
check('every servable country prices', unpriced, [])

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
process.exit(failures === 0 ? 0 : 1)
