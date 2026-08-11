export type Region =
  | 'North America'
  | 'Caribbean'
  | 'Central America'
  | 'South America'
  | 'Western Europe'
  | 'Northern Europe'
  | 'Southern Europe'
  | 'Eastern Europe'
  | 'Middle East'
  | 'East Asia'
  | 'Southeast Asia'
  | 'South Asia'
  | 'Central Asia'
  | 'Oceania'
  | 'North Africa'
  | 'Sub-Saharan Africa'

export interface Country {
  iso: string
  name: string
  region: string

  /** DHL Express Worldwide rating zone, A-N. */
  dhl?: string
  /** UPS zone codes for a Denver (west) origin. */
  upsExpress?: string
  upsSaver?: string
  upsExpedited?: string
  /** FedEx international export zone, A-O. */
  fedex?: string
  /** USPS price groups and per-country weight ceilings. */
  uspsPmi?: number
  uspsPmiMaxLb?: number
  uspsPmiFlat?: number
  uspsPmei?: number
  uspsPmeiMaxLb?: number
  uspsPmeiFlat?: number
  uspsFcpis?: number

  /** Standard import VAT/GST rate, percent. */
  vat?: number
  /** Typical all-in duty rate on general merchandise, percent. */
  duty?: number
  /** Goods value below which duty is not assessed, USD. */
  dutyDeMinimis?: number
  /** Goods value below which import VAT/GST is not assessed, USD. */
  taxDeMinimis?: number
  /** No reliable commercial parcel service from the U.S. */
  restricted?: boolean
}

export type CarrierId = 'usps' | 'ups' | 'fedex' | 'dhl'

export type ServiceTier = 'express' | 'economy' | 'postal'

export interface ServiceDef {
  id: string
  carrier: CarrierId
  name: string
  tier: ServiceTier
  /** Dimensional divisor in cubic inches per pound; 0 means no DIM pricing. */
  dimDivisor: number
  blurb: string
}

export interface Dimensions {
  length: number
  width: number
  height: number
}

export interface Container {
  id: string
  name: string
  kind: 'poly' | 'bubble' | 'box' | 'tube' | 'flat-rate'
  /** Usable interior dimensions, inches. */
  inner: Dimensions
  /** Exterior dimensions used for dimensional weight, inches. */
  outer: Dimensions
  /** Empty weight, lb. */
  tareLb: number
  /** Unit cost at typical case quantity, USD. */
  unitCost: number
  /** Manufacturer weight ceiling, lb. */
  maxLoadLb: number
  /** Only usable with this carrier's service family. */
  carrierLock?: CarrierId
  /** USPS flat-rate key, when the container prices as flat rate. */
  flatRateKey?: string
  note?: string
}

export interface Item {
  lengthIn: number
  widthIn: number
  heightIn: number
  weightLb: number
  /** Declared customs value of the goods, USD. */
  valueUsd: number
  quantity: number
  fragile: boolean
}

export interface PackOptions {
  /** Inches of protective padding per side; 0 for a shrink-fit poly bag. */
  paddingIn: number
  useVoidFill: boolean
  bubbleWrap: boolean
  /** Charge a printed commercial invoice / customs paperwork set. */
  customsPaperwork: boolean
}

export interface PackedParcel {
  container: Container
  /** Total shipped weight: goods + tare + dunnage. */
  grossWeightLb: number
  /** Billable weight after dimensional pricing, per carrier divisor. */
  outer: Dimensions
  /** Itemised packaging cost. */
  materials: CostLine[]
  materialsTotal: number
  /** Warnings such as UPS additional-handling exposure. */
  flags: string[]
}

export interface CostLine {
  label: string
  amount: number
  /** Whether the number comes from a published tariff or is a modelled estimate. */
  basis: 'published' | 'estimate'
  detail?: string
}

export interface QuoteInput {
  country: Country
  item: Item
  pack: PackOptions
  /** Fuel surcharge percentages by carrier. */
  fuelPct: Record<CarrierId, number>
  residential: boolean
  signature: boolean
  insurance: boolean
  remoteArea: boolean
  /** Shipper pays duty and tax at origin (DDP) rather than the consignee. */
  ddp: boolean
  /** Override the country's default duty rate, percent. */
  dutyRateOverride?: number
}

export interface Quote {
  service: ServiceDef
  container: Container
  available: true
  billableWeightLb: number
  grossWeightLb: number
  dimWeightLb: number
  /** Transportation charge before surcharges. */
  baseRate: number
  lines: CostLine[]
  /** Everything the shipper pays: freight + surcharges + packaging. */
  shipperCost: number
  /** Duty + VAT, whoever pays it. */
  importCharges: number
  /** shipperCost + importCharges + goods value. */
  landedCost: number
  transitDays: number
  flags: string[]
}

export interface Unavailable {
  service: ServiceDef
  container: Container
  available: false
  reason: string
}

export type QuoteResult = Quote | Unavailable
