"""Marketplace: Pro membership + 'Daven for a name' jobs board.

Isolated package (own tables, own auth tokens) so it stays cleanly separable
from the core siddur app. Money-free in this phase; a Stripe Connect payment
provider slots in behind payments.PaymentProvider without touching the domain.
"""
