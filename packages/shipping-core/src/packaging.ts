import type { Container, CostLine, Dimensions, Item, PackOptions, PackedParcel } from './types'

/**
 * Packaging catalogue. Unit costs are typical U.S. wholesale prices at case
 * quantity (2026); they are modelled inputs, not carrier tariffs, and every
 * quote labels them as such.
 */
export const CONTAINERS: Container[] = [
  // --- Poly mailers: cheapest and lightest, no crush protection -------------
  {
    id: 'poly-6x9',
    name: 'Poly mailer 6×9″',
    kind: 'poly',
    inner: { length: 6, width: 9, height: 1 },
    outer: { length: 6, width: 9, height: 1 },
    tareLb: 0.01,
    unitCost: 0.04,
    maxLoadLb: 1,
  },
  {
    id: 'poly-10x13',
    name: 'Poly mailer 10×13″',
    kind: 'poly',
    inner: { length: 10, width: 13, height: 2 },
    outer: { length: 10, width: 13, height: 2 },
    tareLb: 0.02,
    unitCost: 0.06,
    maxLoadLb: 3,
  },
  {
    id: 'poly-14x19',
    name: 'Poly mailer 14.5×19″',
    kind: 'poly',
    inner: { length: 14.5, width: 19, height: 3 },
    outer: { length: 14.5, width: 19, height: 3 },
    tareLb: 0.04,
    unitCost: 0.11,
    maxLoadLb: 5,
  },
  {
    id: 'poly-19x24',
    name: 'Poly mailer 19×24″',
    kind: 'poly',
    inner: { length: 19, width: 24, height: 4 },
    outer: { length: 19, width: 24, height: 4 },
    tareLb: 0.07,
    unitCost: 0.19,
    maxLoadLb: 8,
  },

  // --- Bubble mailers: light padding ---------------------------------------
  {
    id: 'bubble-0',
    name: 'Bubble mailer #0 (6×10″)',
    kind: 'bubble',
    inner: { length: 6, width: 10, height: 1.5 },
    outer: { length: 6.5, width: 10.5, height: 1.5 },
    tareLb: 0.03,
    unitCost: 0.14,
    maxLoadLb: 1,
  },
  {
    id: 'bubble-2',
    name: 'Bubble mailer #2 (8.5×12″)',
    kind: 'bubble',
    inner: { length: 8.5, width: 12, height: 2 },
    outer: { length: 9, width: 12.5, height: 2 },
    tareLb: 0.05,
    unitCost: 0.19,
    maxLoadLb: 2,
  },
  {
    id: 'bubble-5',
    name: 'Bubble mailer #5 (10.5×16″)',
    kind: 'bubble',
    inner: { length: 10.5, width: 16, height: 2.5 },
    outer: { length: 11, width: 16.5, height: 2.5 },
    tareLb: 0.09,
    unitCost: 0.29,
    maxLoadLb: 4,
  },
  {
    id: 'bubble-7',
    name: 'Bubble mailer #7 (14.25×20″)',
    kind: 'bubble',
    inner: { length: 14.25, width: 20, height: 3 },
    outer: { length: 15, width: 20.5, height: 3 },
    tareLb: 0.15,
    unitCost: 0.44,
    maxLoadLb: 6,
  },

  // --- Corrugated boxes -----------------------------------------------------
  {
    id: 'box-6',
    name: 'Box 6×6×6″',
    kind: 'box',
    inner: { length: 6, width: 6, height: 6 },
    outer: { length: 6.25, width: 6.25, height: 6.25 },
    tareLb: 0.25,
    unitCost: 0.55,
    maxLoadLb: 20,
  },
  {
    id: 'box-10x8x6',
    name: 'Box 10×8×6″',
    kind: 'box',
    inner: { length: 10, width: 8, height: 6 },
    outer: { length: 10.25, width: 8.25, height: 6.25 },
    tareLb: 0.42,
    unitCost: 0.78,
    maxLoadLb: 30,
  },
  {
    id: 'box-12x12x8',
    name: 'Box 12×12×8″',
    kind: 'box',
    inner: { length: 12, width: 12, height: 8 },
    outer: { length: 12.25, width: 12.25, height: 8.25 },
    tareLb: 0.72,
    unitCost: 1.15,
    maxLoadLb: 40,
  },
  {
    id: 'box-16x12x10',
    name: 'Box 16×12×10″',
    kind: 'box',
    inner: { length: 16, width: 12, height: 10 },
    outer: { length: 16.25, width: 12.25, height: 10.25 },
    tareLb: 1.05,
    unitCost: 1.62,
    maxLoadLb: 50,
  },
  {
    id: 'box-20x16x12',
    name: 'Box 20×16×12″',
    kind: 'box',
    inner: { length: 20, width: 16, height: 12 },
    outer: { length: 20.5, width: 16.5, height: 12.5 },
    tareLb: 1.85,
    unitCost: 2.65,
    maxLoadLb: 65,
  },
  {
    id: 'box-24x18x18',
    name: 'Double-wall box 24×18×18″',
    kind: 'box',
    inner: { length: 24, width: 18, height: 18 },
    outer: { length: 24.5, width: 18.5, height: 18.5 },
    tareLb: 3.6,
    unitCost: 5.4,
    maxLoadLb: 120,
  },

  // --- USPS flat rate: the container is free, the postage is fixed ----------
  {
    id: 'usps-fre',
    name: 'USPS Flat Rate Envelope',
    kind: 'flat-rate',
    inner: { length: 12.5, width: 9.5, height: 0.75 },
    outer: { length: 12.5, width: 9.5, height: 0.75 },
    tareLb: 0.06,
    unitCost: 0,
    maxLoadLb: 4,
    carrierLock: 'usps',
    flatRateKey: 'pmiFlatRateEnvelope',
    note: 'Container supplied free by USPS. Postage is fixed regardless of weight up to 4 lb.',
  },
  {
    id: 'usps-small-box',
    name: 'USPS Small Flat Rate Box',
    kind: 'flat-rate',
    inner: { length: 8.625, width: 5.375, height: 1.625 },
    outer: { length: 8.6875, width: 5.4375, height: 1.75 },
    tareLb: 0.13,
    unitCost: 0,
    maxLoadLb: 4,
    carrierLock: 'usps',
    flatRateKey: 'pmiSmallFlatRateBox',
    note: 'Container supplied free by USPS.',
  },
  {
    id: 'usps-medium-box',
    name: 'USPS Medium Flat Rate Box',
    kind: 'flat-rate',
    inner: { length: 11, width: 8.5, height: 5.5 },
    outer: { length: 11.25, width: 8.75, height: 6 },
    tareLb: 0.5,
    unitCost: 0,
    maxLoadLb: 20,
    carrierLock: 'usps',
    flatRateKey: 'pmiMediumFlatRateBox',
    note: 'Container supplied free by USPS. Often the cheapest way to send 8-20 lb of dense goods.',
  },
  {
    id: 'usps-large-box',
    name: 'USPS Large Flat Rate Box',
    kind: 'flat-rate',
    inner: { length: 11.75, width: 12, height: 5.5 },
    outer: { length: 12, width: 12.25, height: 6 },
    tareLb: 0.8,
    unitCost: 0,
    maxLoadLb: 20,
    carrierLock: 'usps',
    flatRateKey: 'pmiLargeFlatRateBox',
    note: 'Container supplied free by USPS.',
  },
]

export const CONTAINER_BY_ID: Record<string, Container> =
  Object.fromEntries(CONTAINERS.map((c) => [c.id, c]))

/** Consumable prices, USD. Modelled inputs. */
export const CONSUMABLES = {
  tapePerBox: 0.05,
  labelAndPouch: 0.06,
  customsPaperwork: 0.04,
  /** Kraft void fill, per cubic inch of empty space. */
  voidFillPerCuIn: 0.00049,
  voidFillLbPerCuIn: 0.0007,
  /** Small-bubble wrap, per square inch of item surface. */
  bubblePerSqIn: 0.0007,
  bubbleLbPerSqIn: 0.00002,
}

const volume = (d: Dimensions) => d.length * d.width * d.height

function fitsInside(item: Dimensions, inner: Dimensions, padding: number): boolean {
  const need = [item.length + padding * 2, item.width + padding * 2, item.height + padding * 2].sort(
    (a, b) => b - a,
  )
  const have = [inner.length, inner.width, inner.height].sort((a, b) => b - a)
  return need.every((n, i) => n <= have[i] + 1e-9)
}

/** Footprint of `quantity` items stacked in the most compact way we model. */
export function itemStack(item: Item): Dimensions {
  const n = Math.max(1, Math.floor(item.quantity))
  if (n === 1) return { length: item.lengthIn, width: item.widthIn, height: item.heightIn }
  // Stack along the shortest axis so the parcel stays as cubic as possible.
  const dims = [item.lengthIn, item.widthIn, item.heightIn]
  const shortest = dims.indexOf(Math.min(...dims))
  const out = [...dims]
  out[shortest] = out[shortest] * n
  return { length: out[0], width: out[1], height: out[2] }
}

/**
 * UPS assesses Additional Handling on soft-sided packs above these limits and
 * on anything not fully encased in corrugated board.
 * Source: UPS Rate and Service Guide 2026, Other Charges — Additional Handling.
 */
export function upsAdditionalHandling(container: Container, outer: Dimensions, grossLb: number) {
  const sorted = [outer.length, outer.width, outer.height].sort((a, b) => b - a)
  const softPack = container.kind === 'poly' || container.kind === 'bubble'
  const reasons: string[] = []
  if (softPack && (sorted[0] > 18 || sorted[1] > 14 || sorted[2] > 6)) {
    reasons.push('soft-sided pack over 18″ × 14″ × 6″')
  }
  if (grossLb > 55) reasons.push('actual weight over 55 lb')
  const girth = sorted[0] + 2 * sorted[1] + 2 * sorted[2]
  if (girth > 105) reasons.push('length + girth over 105″')
  if (sorted[0] > 48) reasons.push('longest side over 48″')
  if (sorted[1] > 30) reasons.push('second-longest side over 30″')
  if (volume(outer) > 10368) reasons.push('cubic size over 10,368 in³')
  return reasons
}

/** Build the packed parcel for one container choice. */
export function pack(item: Item, container: Container, opts: PackOptions): PackedParcel | null {
  const stack = itemStack(item)
  const padding = container.kind === 'box' ? Math.max(opts.paddingIn, 0) : Math.min(opts.paddingIn, 0.25)
  if (!fitsInside(stack, container.inner, padding)) return null

  const qty = Math.max(1, Math.floor(item.quantity))
  const goodsLb = item.weightLb * qty
  if (goodsLb > container.maxLoadLb) return null

  const materials: CostLine[] = [
    {
      label: container.name,
      amount: container.unitCost,
      basis: 'estimate',
      detail: container.unitCost === 0 ? 'Supplied free by the carrier' : 'Case-quantity unit price',
    },
    { label: 'Label + document pouch', amount: CONSUMABLES.labelAndPouch, basis: 'estimate' },
  ]
  let dunnageLb = 0

  if (container.kind === 'box' || container.kind === 'flat-rate') {
    materials.push({ label: 'Carton sealing tape', amount: CONSUMABLES.tapePerBox, basis: 'estimate' })
  }
  if (opts.bubbleWrap || item.fragile) {
    const surface =
      2 * (stack.length * stack.width + stack.length * stack.height + stack.width * stack.height)
    materials.push({
      label: 'Bubble wrap',
      amount: round2(surface * CONSUMABLES.bubblePerSqIn),
      basis: 'estimate',
      detail: `${Math.round(surface)} in² of item surface`,
    })
    dunnageLb += surface * CONSUMABLES.bubbleLbPerSqIn
  }
  const voidVolume = Math.max(0, volume(container.inner) - volume(stack))
  if (opts.useVoidFill && container.kind !== 'poly' && voidVolume > 0) {
    materials.push({
      label: 'Kraft void fill',
      amount: round2(voidVolume * CONSUMABLES.voidFillPerCuIn),
      basis: 'estimate',
      detail: `${Math.round(voidVolume)} in³ of empty space`,
    })
    dunnageLb += voidVolume * CONSUMABLES.voidFillLbPerCuIn
  }
  if (opts.customsPaperwork) {
    materials.push({
      label: 'Customs paperwork set',
      amount: CONSUMABLES.customsPaperwork,
      basis: 'estimate',
      detail: 'Commercial invoice, 3 copies',
    })
  }

  const materialsTotal = round2(materials.reduce((s, l) => s + l.amount, 0))
  const grossWeightLb = round2(goodsLb + container.tareLb + dunnageLb)
  const flags: string[] = []
  if (container.kind === 'poly' && item.fragile) {
    flags.push('Fragile goods in an unpadded poly bag — damage claims are usually denied.')
  }
  if (grossWeightLb > container.maxLoadLb) return null

  return { container, grossWeightLb, outer: container.outer, materials, materialsTotal, flags }
}

/** Every container the goods physically fit into. */
export function candidateContainers(item: Item, opts: PackOptions): PackedParcel[] {
  return CONTAINERS.map((c) => pack(item, c, opts)).filter((p): p is PackedParcel => p !== null)
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100
}
