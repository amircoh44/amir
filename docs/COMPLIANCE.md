# Compliance & Regulatory Notes

> ⚠️ THC/CBD sales carry legal, regulatory, and payment-processor requirements.
> This document captures the gating the platform enforces and the checks the
> operator must complete **before going live**. It is not legal advice —
> consult counsel for your jurisdiction.

## What the platform enforces in code

1. **Business verification gating** (`REQUIRE_BUSINESS_VERIFICATION=true`).
   - New accounts start with `verification_status = pending` and **cannot
     purchase** (`require_verified` dependency on checkout).
   - An admin reviews license / reseller cert / EIN and sets `approved`,
     `rejected`, or `suspended` via `PUT /api/admin/customers/{id}/verification`.
2. **Age affirmation** — `MINIMUM_AGE` (default 21). Surface a 21+ gate in the
   UI; record affirmation at registration.
3. **State restrictions** — `RESTRICTED_STATES` blocks shipping to listed
   ISO-2 states. Extend `services/orders.py` to reject checkout when the
   buyer's `state` is restricted for a given product category.
4. **Audit-friendly order history** — order line items snapshot product name,
   quantity, and price at purchase time and are never mutated.

## Operator checklist before launch

- [ ] **Confirm Stripe permits your specific product category.** Many
  cannabis/THC products are prohibited on standard Stripe. Compliant CBD may
  require pre-approval. If Stripe declines the category, integrate a
  cannabis-friendly processor — the `services/stripe_service.py` boundary is
  the only place to swap.
- [ ] Collect and store (encrypted / access-controlled) business license,
  reseller certificate, and EIN for each approved account.
- [ ] Configure `RESTRICTED_STATES` for every state you cannot ship to.
- [ ] Add Certificates of Analysis (COA) per product/lot if required.
- [ ] Add lab-test / potency disclosures and required warnings to product pages.
- [ ] Confirm shipping carrier rules for your product category.
- [ ] Terms of Service + Privacy Policy reviewed by counsel.
- [ ] Data-retention policy for KYC/verification documents.

## Where to extend

| Need | File |
|------|------|
| Block restricted-state checkout | `app/services/orders.py` |
| Swap payment processor | `app/services/stripe_service.py` |
| Add COA / lab fields to products | `app/models/product.py` + migration |
| Stronger KYC document upload | `app/api/routes/account.py` |
