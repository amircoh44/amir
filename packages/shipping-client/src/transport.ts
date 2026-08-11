import {
  CONTAINERS,
  CONTAINER_BY_ID,
  pack,
  type Address,
  type AddressCheckResult,
  type Item,
  type LiveRateResponse,
  type PackOptions,
  type PackedParcel,
  type QuoteInput,
} from '@amir/shipping-core'

export interface ShippingClientConfig {
  /** Base URL of the rates proxy, e.g. https://rates.example.workers.dev */
  baseUrl: string
  /** Milliseconds before a request is abandoned. */
  timeoutMs?: number
  /**
   * Optional caller identity. This is NOT the aggregator key — that lives only
   * on the proxy. Use it if you put your own auth in front of the proxy.
   */
  authToken?: string
  fetchImpl?: typeof fetch
}

export class ShippingApiError extends Error {
  /** HTTP status from the proxy; 0 for a network failure, timeout or abort. */
  readonly status: number
  readonly detail?: unknown

  constructor(message: string, status: number, detail?: unknown) {
    super(message)
    this.name = 'ShippingApiError'
    this.status = status
    this.detail = detail
  }
}

/** Request body the proxy expects for a rate lookup. */
export interface LiveRateRequest {
  to: Address
  /** Defaults to the Denver origin configured on the proxy. */
  from?: Address
  parcel: {
    lengthIn: number
    widthIn: number
    heightIn: number
    weightOz: number
  }
  customs: {
    contentsType: 'merchandise' | 'gift' | 'documents' | 'sample' | 'returned_goods'
    valueUsd: number
    description: string
    quantity: number
    hsTariffNumber?: string
    originCountry: string
  }
}

export function createShippingClient(config: ShippingClientConfig) {
  const doFetch = config.fetchImpl ?? globalThis.fetch
  const timeoutMs = config.timeoutMs ?? 15_000
  const base = config.baseUrl.replace(/\/$/, '')

  async function post<T>(path: string, body: unknown, signal?: AbortSignal): Promise<T> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    // Fold the caller's signal into ours so either side can cancel.
    const onAbort = () => controller.abort()
    signal?.addEventListener('abort', onAbort)

    try {
      const res = await doFetch(`${base}${path}`, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(config.authToken ? { authorization: `Bearer ${config.authToken}` } : {}),
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      })

      const text = await res.text()
      const json: unknown = text ? JSON.parse(text) : null

      if (!res.ok) {
        const detail =
          json && typeof json === 'object' && 'error' in json
            ? String((json as { error: unknown }).error)
            : res.statusText
        throw new ShippingApiError(`Rate proxy returned ${res.status}: ${detail}`, res.status, json)
      }
      return json as T
    } catch (err) {
      if (err instanceof ShippingApiError) throw err
      if ((err as Error)?.name === 'AbortError') {
        throw new ShippingApiError(
          signal?.aborted ? 'Request cancelled' : `Rate proxy timed out after ${timeoutMs} ms`,
          0,
        )
      }
      throw new ShippingApiError((err as Error).message || 'Network error', 0)
    } finally {
      clearTimeout(timer)
      signal?.removeEventListener('abort', onAbort)
    }
  }

  return {
    rates: (req: LiveRateRequest, signal?: AbortSignal) =>
      post<LiveRateResponse>('/v1/rates', req, signal),

    verifyAddress: (address: Address, signal?: AbortSignal) =>
      post<AddressCheckResult>('/v1/address/verify', { address }, signal),
  }
}

export type ShippingClient = ReturnType<typeof createShippingClient>

/**
 * The smallest container the goods fit into.
 *
 * Carrier-locked containers are skipped: a live quote covers real carrier
 * services, and USPS flat-rate pricing is already exact in the published
 * tables, so there is nothing to learn by asking the aggregator about it.
 */
export function smallestParcel(item: Item, opts: PackOptions): PackedParcel | null {
  let best: PackedParcel | null = null
  let bestVolume = Infinity
  for (const container of CONTAINERS) {
    if (container.carrierLock) continue
    const packed = pack(item, container, opts)
    if (!packed) continue
    const volume = packed.outer.length * packed.outer.width * packed.outer.height
    if (volume < bestVolume) {
      best = packed
      bestVolume = volume
    }
  }
  return best
}

/**
 * Turn the calculator's item and packaging model into the parcel the proxy
 * wants. Pass `containerId` to quote a specific container instead of the
 * smallest one that fits.
 */
export function buildRateRequest(
  input: QuoteInput,
  to: Address,
  containerId?: string,
): LiveRateRequest | null {
  const container = containerId ? CONTAINER_BY_ID[containerId] : undefined
  const parcel = container
    ? pack(input.item, container, input.pack)
    : smallestParcel(input.item, input.pack)
  if (!parcel) return null

  return {
    to,
    parcel: {
      lengthIn: parcel.outer.length,
      widthIn: parcel.outer.width,
      heightIn: parcel.outer.height,
      weightOz: Math.max(1, Math.round(parcel.grossWeightLb * 16)),
    },
    customs: {
      contentsType: 'merchandise',
      valueUsd: input.item.valueUsd,
      description: 'General merchandise',
      quantity: Math.max(1, Math.floor(input.item.quantity)),
      originCountry: 'US',
    },
  }
}
