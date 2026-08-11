import { DEFAULT_FUEL_PCT } from './services'
import type { CarrierId, Item, PackOptions } from './types'

export interface Settings {
  destination: string
  item: Item
  pack: PackOptions
  fuelPct: Record<CarrierId, number>
  residential: boolean
  signature: boolean
  insurance: boolean
  remoteArea: boolean
  ddp: boolean
  dutyRateOverride: number | null
}

export const DEFAULT_SETTINGS: Settings = {
  destination: 'GB',
  item: {
    lengthIn: 9,
    widthIn: 6,
    heightIn: 2,
    weightLb: 1.5,
    valueUsd: 120,
    quantity: 1,
    fragile: false,
  },
  pack: { paddingIn: 1, useVoidFill: true, bubbleWrap: false, customsPaperwork: true },
  fuelPct: { ...DEFAULT_FUEL_PCT },
  residential: true,
  signature: false,
  insurance: false,
  remoteArea: false,
  ddp: false,
  dutyRateOverride: null,
}
