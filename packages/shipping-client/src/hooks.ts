import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  bestPerService,
  reconcile,
  type Address,
  type AddressCheckResult,
  type LiveRate,
  type QuoteInput,
  type ReconciledRow,
} from '@amir/shipping-core'
import {
  buildRateRequest,
  ShippingApiError,
  type LiveRateRequest,
  type ShippingClient,
} from './transport'

/**
 * These hooks use nothing but React and `fetch`, so they run unchanged in the
 * web app and in React Native.
 */

export interface AsyncState<T> {
  data: T | null
  loading: boolean
  error: string | null
}

const idle = <T,>(): AsyncState<T> => ({ data: null, loading: false, error: null })

/**
 * Live rates for the current parcel, with published tariff rates always
 * available underneath.
 *
 * The published quotes are computed synchronously and never fail, so the UI has
 * something to show while the network request is in flight and if it fails
 * outright. `rows` pairs the two up service by service.
 */
export function useRates(
  client: ShippingClient | null,
  input: QuoteInput,
  to: Address | null,
  options: { enabled?: boolean; debounceMs?: number } = {},
) {
  const { enabled = true, debounceMs = 400 } = options
  const [live, setLive] = useState<AsyncState<LiveRate[]>>(idle)
  const [messages, setMessages] = useState<string[]>([])
  const inFlight = useRef<AbortController | null>(null)

  // Published rates are pure computation over bundled tables — no network.
  const published = useMemo(() => bestPerService(input), [input])

  const request: LiveRateRequest | null = useMemo(
    () => (to ? buildRateRequest(input, to) : null),
    [input, to],
  )

  // Only re-fetch when the request body actually changes, not on every render
  // of a new-but-equal object.
  const requestKey = request ? JSON.stringify(request) : null

  useEffect(() => {
    if (!client || !requestKey || !enabled) {
      setLive(idle)
      return
    }

    const timer = setTimeout(() => {
      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller

      setLive((prev) => ({ data: prev.data, loading: true, error: null }))

      client
        .rates(JSON.parse(requestKey) as LiveRateRequest, controller.signal)
        .then((res) => {
          if (controller.signal.aborted) return
          setLive({ data: res.rates, loading: false, error: null })
          setMessages(res.messages ?? [])
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          const msg =
            err instanceof ShippingApiError ? err.message : (err as Error).message || 'Rate lookup failed'
          // Keep the last good rates on screen; the published table still stands.
          setLive((prev) => ({ data: prev.data, loading: false, error: msg }))
        })
    }, debounceMs)

    return () => {
      clearTimeout(timer)
      inFlight.current?.abort()
    }
  }, [client, requestKey, enabled, debounceMs])

  const rows: ReconciledRow[] = useMemo(
    () => reconcile(published, live.data ?? []),
    [published, live.data],
  )

  return {
    published,
    liveRates: live.data ?? [],
    rows,
    messages,
    loading: live.loading,
    /** Non-null when the live lookup failed. Published rates are still valid. */
    error: live.error,
    /** True when showing published tariffs only. */
    offline: !client || !enabled || (!live.loading && live.data === null),
  }
}

/**
 * Address verification, debounced, with the in-flight request cancelled when
 * the address changes underneath it.
 */
export function useAddressCheck(
  client: ShippingClient | null,
  address: Address | null,
  options: { enabled?: boolean; debounceMs?: number } = {},
) {
  const { enabled = true, debounceMs = 600 } = options
  const [state, setState] = useState<AsyncState<AddressCheckResult>>(idle)
  const inFlight = useRef<AbortController | null>(null)

  // Don't call out until there is enough of an address to be worth checking.
  const ready = Boolean(address?.street1 && address.country && (address.zip || address.city))
  const key = ready && address ? JSON.stringify(address) : null

  useEffect(() => {
    if (!client || !key || !enabled) {
      setState(idle)
      return
    }

    const timer = setTimeout(() => {
      inFlight.current?.abort()
      const controller = new AbortController()
      inFlight.current = controller
      setState((prev) => ({ data: prev.data, loading: true, error: null }))

      client
        .verifyAddress(JSON.parse(key) as Address, controller.signal)
        .then((res) => {
          if (!controller.signal.aborted) setState({ data: res, loading: false, error: null })
        })
        .catch((err: unknown) => {
          if (controller.signal.aborted) return
          setState({ data: null, loading: false, error: (err as Error).message })
        })
    }, debounceMs)

    return () => {
      clearTimeout(timer)
      inFlight.current?.abort()
    }
  }, [client, key, enabled, debounceMs])

  const accept = useCallback(
    (onAccept: (a: Address) => void) => {
      if (state.data?.normalized) onAccept(state.data.normalized)
    },
    [state.data],
  )

  return { ...state, ready, accept }
}
