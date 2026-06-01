from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.models.quote import QuoteStatus


class QuoteCreate(BaseModel):
    product_id: int | None = None
    product_description: str = Field(min_length=3)
    requested_quantity: int = Field(gt=0)
    target_unit_price_cents: int | None = Field(default=None, ge=0)
    message: str | None = None


class QuoteRespond(BaseModel):
    quoted_unit_price_cents: int = Field(ge=0)
    admin_response: str | None = None
    status: QuoteStatus = QuoteStatus.responded


class QuoteOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reference: str
    product_id: int | None
    product_description: str
    requested_quantity: int
    target_unit_price_cents: int | None
    status: QuoteStatus
    quoted_unit_price_cents: int | None
    admin_response: str | None
    created_at: datetime
