# Third-party API costs — Denver shipping calculator

**Prepared:** 11 August 2026
**Scope:** every external service the app depends on, priced against *this*
application's actual usage pattern.
**Stack under review:** EasyPost (rates + address validation) → Cloudflare
Workers (rate proxy) → the web and React Native clients.

---

## 1. Executive summary

For this application, **the cost is address verification and almost nothing
else.** Labels — normally the dominant line item on any shipping aggregator —
are free here because the app quotes shipments and never buys postage.

| Driver | Annual cost at 2,000 verifications/month |
| --- | --- |
| Address verification | **$1,440** |
| EasyPost plan (only if using your own carrier accounts) | $240 |
| Cloudflare Workers | $0–60 |
| Labels | $0 — none are purchased |
| Rate lookups | $0 — not separately metered |
| **Total** | **$1,440 – $1,740 / year** |

Three findings worth acting on before you spend anything:

1. **Address verification at $0.06 per international lookup is the entire
   bill.** Every cost decision should be about reducing that number.
2. **Two defects in the current implementation inflate it.** One will break the
   Cloudflare free tier at ~1,000 requests/day; the other bills a verification
   while the user is still typing. Both are fixable in under an hour. See §7.
3. **Going direct to USPS is no longer the cheap escape hatch.** That changed
   twice during 2026 — see §9.

---

## 2. Why this app's cost profile is unusual

Shipping aggregators monetise **labels**. Their pricing pages, their free
tiers and every comparison article you'll read are built around a business that
buys postage.

This app does not buy postage. It:

- computes rates from bundled published tariff tables (zero API calls),
- optionally fetches live account rates for comparison,
- verifies delivery addresses.

That inverts the normal cost model. The "free up to 3,000 labels" headline is
irrelevant, and a line item most shippers never notice — standalone address
verification — becomes 100% of the bill.

It also creates a **commercial risk that is not on any price list**: see §11.

---

## 3. Unit price reference

### 3.1 EasyPost

| Item | Price | Relevant here |
| --- | --- | --- |
| Suite / Nexus — Free tier | Free up to 3,000 labels/mo | Plan is free; label allowance unused |
| Additional labels | $0.08 each | No — no labels bought |
| **BYOCA plan** (bring your own carrier accounts) | **$20/month** + $0.08/label | **Yes, if** you want your own negotiated rates |
| Enterprise | Custom | Only at high volume |
| Rate shopping / shipment creation | Not separately metered | Yes — effectively free |
| Address verification bundled with a label | 1 free per label | No |
| **Address verification, standalone, domestic** | **$0.02 / request** | Only for US destinations |
| **Address verification, standalone, international** | **$0.06 / request** | **Yes — the main cost** |
| Tracking API | $0.01–0.03 per shipment | Only if you add tracking |
| Advanced tracking | $0.03 per shipment | Optional |
| Insurance | 1% of declared value, $1.00 minimum | Only if you sell insurance |
| Funding by card | 3.75% convenience fee | Avoid — ACH is free |
| Funding by ACH | Free | Use this |

> **Wallet vs BYOCA — the fork that matters.**
> On the free tier you get EasyPost's *own* commercial carrier pricing from
> their wallet. That is a real, usable rate. But the app's "your rate vs
> published list" comparison is only meaningful with **your** negotiated
> accounts, which requires BYOCA at $20/month. If you don't have negotiated
> carrier contracts yet, stay on the free tier and skip the $240/year.

### 3.2 Cloudflare Workers

| Item | Free plan | Paid plan ($5/month) |
| --- | --- | --- |
| Requests | 100,000 / day | 10,000,000 / month included, then ~$0.30–0.50 per million |
| CPU time | 10 ms per invocation | 30,000,000 CPU-ms included |
| **KV reads** | 100,000 / day | 10,000,000 / month, then $0.50 per million |
| **KV writes** | **1,000 / day** | 1,000,000 / month, then **$5.00 per million** |
| KV storage | 1 GB | $0.50 per GB-month |

**KV writes are the binding constraint**, not requests. They cost 10× reads on
the paid plan and the free allowance is tiny. See §7.1.

### 3.3 USPS direct

| Item | Status as of August 2026 |
| --- | --- |
| Legacy Web Tools XML API | **Retired 25 January 2026** — do not build on it |
| v3 REST APIs (registration) | Free to register at developers.usps.com |
| Domestic / International Prices (rating) | No published fee |
| **Address API** | **Signed licence + tier-based fees from 12 July 2026** |
| Rate limits | Disputed — see §9 |

---

## 4. The cost model

```
Monthly cost =
      (international verifications × $0.06)
    + (domestic verifications      × $0.02)
    + (BYOCA ? $20 : $0)
    + Cloudflare plan
    + (labels × $0.08, beyond 3,000)      ← zero for this app
```

Rate lookups do not appear. That is correct as far as any published price list
goes, and it is the single biggest reason this stack is cheap for a calculator.

---

## 5. Worked scenarios

Verification volume is the independent variable, because everything else is
either free or a flat fee.

| Verifications / month | Verification cost | Cloudflare | **Total (wallet rates)** | **Total (BYOCA)** |
| ---: | ---: | ---: | ---: | ---: |
| 100 | $6 | $0 | **$6** | **$26** |
| 500 | $30 | $0 | **$30** | **$50** |
| 1,000 | $60 | $5 | **$65** | **$85** |
| 2,000 | $120 | $5 | **$125** | **$145** |
| 5,000 | $300 | $5 | **$305** | **$325** |
| 10,000 | $600 | $5 | **$605** | **$625** |
| 50,000 | $3,000 | $5 | **$3,005** | **$3,025** |

All figures assume international destinations at $0.06. A US-domestic-heavy mix
at $0.02 cuts the verification column by two thirds.

### Cloudflare crossover

The $5/month plan becomes necessary far earlier than the request headline
suggests, because of KV writes:

| Requests / day | Free plan viable? | Why |
| ---: | --- | --- |
| < 500 | Yes | Under 1,000 KV writes/day |
| 500 – 1,000 | Marginal | Rate-limit writes + cache writes approach the cap |
| > 1,000 | **No** | KV write cap exceeded; requests start failing |
| up to ~330,000 | Yes on paid | 10M requests/month included |

You will hit the KV write ceiling at roughly **1,000 requests/day**, which is
1% of the advertised 100,000/day request allowance. Fixing §7.1 raises that
ceiling substantially.

---

## 6. Sensitivity — what actually moves the number

Ranked by leverage:

1. **Number of distinct addresses verified.** Linear, $0.06 each. Everything
   else is noise.
2. **Whether you verify per keystroke or per submission.** A 3–5× difference on
   the same traffic. See §7.2.
3. **Whether you cache verification results.** Repeat customers and repeat
   checkout attempts on the same address should never be re-billed.
4. **Domestic vs international mix.** 3× price difference per lookup.
5. **BYOCA or not.** Flat $240/year. Irrelevant above ~$500/month of
   verification spend; significant below it.
6. Cloudflare. Effectively $0 or $60/year. Rounding error either way.

---

## 7. Two implementation defects that cost money

Both are in code already committed. Neither is an inherent cost of the
architecture.

### 7.1 KV writes on every request will break the free tier

**Where:** `services/rates-proxy/src/index.ts`, `checkRateLimit()`

```ts
// Current: one KV write per request, always
const current = Number((await env.RATES_KV.get(key)) ?? '0')
if (current >= RATE_LIMIT) return false
await env.RATES_KV.put(key, String(current + 1), { expirationTtl: ... })
```

Every single request performs a KV write, plus another write on each cache
miss. Cloudflare's free KV allowance is **1,000 writes/day**. At ~1,000
requests/day the namespace stops accepting writes and rate limiting fails —
possibly open, depending on how the error surfaces.

There is a second, subtler problem: this counter is **not atomic**. Two
concurrent requests both read `n` and both write `n+1`, so the limit undercounts
under exactly the load it is meant to protect against.

**Options, cheapest first:**

| Fix | Effort | Cost | Notes |
| --- | --- | --- | --- |
| Cloudflare native Rate Limiting binding | Low | $0 | Purpose-built, atomic, no KV writes |
| Durable Object counter | Medium | Usage-based | Atomic and exact; more moving parts |
| Sampled KV counting (write 1 in N) | Low | $0 | Approximate; acceptable for abuse control |
| Just pay the $5/month | None | $60/yr | Does not fix the atomicity bug |

Recommended: the native rate limiting binding, leaving KV for the quote cache
only. That drops KV writes to roughly one per cache miss.

### 7.2 Address verification fires while the user is typing

**Where:** `packages/shipping-client/src/hooks.ts`, `useAddressCheck()`

The hook debounces 600 ms and requires `street1` + `country` + (`zip` or
`city`). That is better than nothing, but a user who types a street, pauses,
then types a postcode triggers **two or more billable verifications** for a
single address. Add a correction or an autofill and it is three or four.

At $0.06 each this is small per session and material at volume — it is
plausibly 3–5× the necessary spend.

**Fix, in order of value:**

1. **Verify on blur or on submit, not on change.** One verification per address
   the user actually commits to.
2. **Cache in KV on the proxy, keyed by a normalised address hash**, with a long
   TTL (30 days is reasonable — addresses do not change often). Repeat checkouts
   from the same customer cost nothing.
3. **Skip the call entirely when nothing meaningful changed** — normalise
   whitespace and case before comparing.

Items 1 and 2 together should cut verification spend by 60–80% on typical
traffic.

---

## 8. Cost controls already in the architecture

Worth stating explicitly, because they are the reason the numbers above are as
low as they are:

- **The calculator works with zero API calls.** Published 2026 tariff tables for
  all four carriers are bundled into both apps. Live rates are opt-in, per
  lookup. Most sessions never trigger a billable call at all — this is a bigger
  lever than any pricing tier.
- **Five-minute KV cache on quotes** (`RATE_CACHE_TTL_S = 300`), keyed by a
  SHA-256 hash of the full request. Identical lookups within the window are
  free.
- **400 ms debounce on rate lookups**, with in-flight requests aborted when
  inputs change. A user dragging the padding slider produces one call, not
  thirty.
- **Per-IP rate limiting**, so a public endpoint cannot be turned into someone
  else's free shipping API at your expense.
- **Published tariffs survive an outage.** If EasyPost is down or you exhaust a
  quota, the app degrades to list rates rather than breaking.

---

## 9. USPS direct vs an aggregator

Going straight to USPS used to be the free option. Two changes in 2026 make
that no longer straightforwardly true.

**What changed:**

- The legacy Web Tools XML API was **retired on 25 January 2026**.
- The replacement v3 REST APIs are free to register for, but the **Address API
  moved to a signed licence agreement with tier-based fees on 12 July 2026**.
  USPS has not broadly published the tier prices; they are communicated through
  licensing channels.

**Rate limits — genuinely unclear.** Independent sources disagree sharply:

| Source | Claim |
| --- | --- |
| USPS documentation (as reported) | 60 requests/hour for address verification |
| Vendor testing (Smarty) | ~20,000/day Addresses; ~500,000/day Pricing; ~1,000/day OAuth |
| PostGrid | 60 addresses/minute |

A 60/hour ceiling would make a live calculator unusable. A 20,000/day ceiling
would be ample. **This is not a detail you can guess at** — confirm with USPS
before designing around it.

**The decision:**

| | USPS direct | EasyPost |
| --- | --- | --- |
| Carriers | USPS only | USPS, UPS, FedEx, DHL + others |
| Rating cost | No published fee | No per-call fee |
| Address validation | Licensed, tier-priced since 12 Jul 2026 | $0.02 / $0.06 per lookup |
| Rate limits | Disputed, possibly severe | Commercial, negotiable |
| Integration effort | One carrier, OAuth 2.0, own quirks | One integration, four carriers |
| Licensing friction | Signed agreement required | Self-serve |

For this app — which shows four carriers side by side — the aggregator is the
right call regardless of price. USPS direct only makes sense if the product
narrows to USPS alone.

---

## 10. Aggregator alternatives

| | EasyPost | Shippo |
| --- | --- | --- |
| Plan | Free (3,000 labels) or $20/mo BYOCA | Free Starter, or Pro $17/mo |
| Per label | $0.08 | $0.05 Starter |
| BYOCA | $20/mo | Free up to 200 labels on Pro |
| Address validation | $0.02 / $0.06 standalone | Available, generally less thorough |
| Best for | Developer-led, custom integrations, scale | Lower volume, dashboard-driven |

Because this app buys no labels, the per-label difference — the axis every
comparison article argues about — **does not apply to you**. Evaluate on
address-validation pricing and international rating coverage instead. If Shippo
prices standalone verification below $0.06 international, that alone could
justify switching.

Switching is cheap by design: the proxy normalises responses into the
`LiveRate` shape declared in `packages/shipping-core/src/providers.ts`, so an
aggregator change touches `services/rates-proxy` only. No client code knows
EasyPost exists.

---

## 11. Risks that are not on any price list

**Rate-to-label ratio.** Aggregators make their money on labels. An account
generating heavy rating traffic and buying zero labels is, from their side, pure
cost. This does not violate any published term, but it is the sort of thing that
prompts a conversation at scale. **Raise it with EasyPost sales up front** and
get the expectation in writing rather than discovering it when your account is
throttled.

**Verification as an attack surface.** Your proxy turns a paid API into an
open-ish endpoint. Every unauthenticated verification request is $0.06 of your
money. The per-IP rate limit helps; a shared token helps more; real user auth
helps most. An origin allowlist does **not** help, because `Origin` is trivially
forged outside a browser.

**Cost observability.** Nothing currently alerts you when spend jumps. Before
going live, set a billing alert on the EasyPost account and log verification
counts from the proxy.

---

## 12. Confidence in these figures

Read this section before budgeting.

| Figure | Confidence | Basis |
| --- | --- | --- |
| Cloudflare Workers and KV pricing | **High** | Cloudflare's own published pricing |
| EasyPost plan fees, label fees, free tier | **High** | EasyPost pricing page |
| EasyPost tracking and insurance pricing | **High** | EasyPost pricing page |
| **Address verification $0.02 / $0.06** | **Medium** | Derived from a support article that returned HTTP 403 on direct fetch; obtained via search summary. **Verify before budgeting — this is the dominant cost.** |
| Rate shopping not separately billed | **Medium** | Absence of a line item is not a guarantee. Confirm in writing. |
| EasyPost 3% USPS postage surcharge, June 2026 | **Low** | Reported by Shippo, a direct competitor. Treat as a prompt to check, not fact. Would not affect this app anyway — no postage is purchased. |
| USPS rate limits | **Low** | Vendor blogs only, mutually contradictory, all selling competing address validation. |
| USPS Address API tier pricing | **Low** | Reported as unpublished; communicated through licensing channels. |

Research was conducted 11 August 2026. Carrier and aggregator pricing moves
frequently; re-check anything above before committing to a budget.

---

## 13. Action checklist

Before spending anything:

- [ ] Confirm standalone address-verification pricing directly with EasyPost —
      domestic and international, in writing.
- [ ] Confirm rate shopping carries no per-call fee and no volume expectation.
- [ ] Decide wallet vs BYOCA. Skip the $20/month unless you hold negotiated
      carrier contracts.
- [ ] Ask about acceptable rate-to-label ratio for a quoting-only account.

Before going to production:

- [ ] Replace the KV-based rate limiter (§7.1) — it breaks the free tier and
      undercounts under concurrency.
- [ ] Move address verification to blur/submit and add a KV cache (§7.2).
- [ ] Set a billing alert on the EasyPost account.
- [ ] Set `CLIENT_TOKEN` on the proxy; do not rely on the origin allowlist alone.
- [ ] Log verification counts so spend is attributable.

Optional, at volume:

- [ ] Price Shippo's standalone verification against EasyPost's $0.06.
- [ ] Consider a dedicated address-validation vendor if verification exceeds
      ~$500/month — at that point it is worth shopping separately from rating.

---

## 14. Appendix — measuring real usage

The estimates above are only as good as your traffic assumptions. To replace
them with measurements, instrument the proxy:

```ts
// services/rates-proxy/src/index.ts — inside the route handlers
console.log(JSON.stringify({
  event: 'billable_call',
  kind: url.pathname === '/v1/address/verify' ? 'verification' : 'rating',
  destination: to.country,
  international: to.country !== 'US',
  cached: Boolean(cacheHit),
}))
```

Pipe Workers logs to a sink (Logpush, or a Workers Analytics Engine dataset) and
the monthly bill becomes:

```
billable_verifications_international × 0.06
  + billable_verifications_domestic  × 0.02
```

Cached calls cost nothing, so tracking the cache-hit ratio directly measures the
value of §7.2's fix.

---

## 15. Sources

- EasyPost pricing — https://www.easypost.com/pricing/
- EasyPost billing and payments — https://support.easypost.com/hc/en-us/articles/360042414212-Billing-Payments
- Cloudflare Workers pricing — https://developers.cloudflare.com/workers/platform/pricing/
- Cloudflare Workers KV free tier — https://blog.cloudflare.com/workers-kv-free-tier/
- Shippo pricing — https://costbench.com/software/shipping-software/shippo/
- Shippo on EasyPost's USPS fee — https://goshippo.com/blog/what-easyposts-new-3-fee-means-for-your-usps-shipping-costs
- Smarty, USPS API rate limits after rollout — https://www.smarty.com/blog/usps-api-rate-limit
- PostGrid, USPS API changes and rate limiting — https://www.postgrid.com/usps-api-changes-with-rate-limiting-to-60-addresses-minute-what-it-means-why-matter/
- USPS developer portal — https://developers.usps.com
