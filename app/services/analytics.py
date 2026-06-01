"""Admin analytics aggregations: revenue, top products, top customers."""

from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Order, OrderItem, PaymentStatus, User


async def revenue_summary(db: AsyncSession, days: int = 30) -> dict:
    since = datetime.now(UTC) - timedelta(days=days)
    result = await db.execute(
        select(
            func.coalesce(func.sum(Order.total_cents), 0),
            func.count(Order.id),
        ).where(Order.payment_status == PaymentStatus.paid, Order.created_at >= since)
    )
    total_cents, order_count = result.one()
    aov = int(total_cents / order_count) if order_count else 0
    return {
        "window_days": days,
        "revenue_cents": int(total_cents),
        "paid_orders": order_count,
        "average_order_value_cents": aov,
    }


async def top_products(db: AsyncSession, limit: int = 10) -> list[dict]:
    result = await db.execute(
        select(
            OrderItem.product_name,
            func.sum(OrderItem.quantity).label("units"),
            func.sum(OrderItem.line_total_cents).label("revenue_cents"),
        )
        .join(Order, Order.id == OrderItem.order_id)
        .where(Order.payment_status == PaymentStatus.paid)
        .group_by(OrderItem.product_name)
        .order_by(func.sum(OrderItem.line_total_cents).desc())
        .limit(limit)
    )
    return [
        {"product_name": name, "units": int(units), "revenue_cents": int(rev)}
        for name, units, rev in result.all()
    ]


async def top_customers(db: AsyncSession, limit: int = 10) -> list[dict]:
    result = await db.execute(
        select(
            User.id,
            User.business_name,
            User.email,
            func.sum(Order.total_cents).label("spent_cents"),
            func.count(Order.id).label("orders"),
        )
        .join(Order, Order.user_id == User.id)
        .where(Order.payment_status == PaymentStatus.paid)
        .group_by(User.id)
        .order_by(func.sum(Order.total_cents).desc())
        .limit(limit)
    )
    return [
        {
            "user_id": uid,
            "business_name": biz,
            "email": email,
            "spent_cents": int(spent),
            "orders": int(orders),
        }
        for uid, biz, email, spent, orders in result.all()
    ]
