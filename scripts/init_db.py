"""Create all tables directly from the models (quick dev bootstrap).

For production, use Alembic migrations instead:
    alembic revision --autogenerate -m "init"
    alembic upgrade head
"""

from __future__ import annotations

import asyncio

from app.core.database import engine
from app.models import Base


async def main() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    print("✓ Tables created.")


if __name__ == "__main__":
    asyncio.run(main())
