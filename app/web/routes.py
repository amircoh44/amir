"""Server-rendered pages (Jinja2). The JSON API under /api powers interactivity."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user_optional
from app.models import Product, User

TEMPLATES_DIR = Path(__file__).resolve().parent.parent / "templates"
templates = Jinja2Templates(directory=str(TEMPLATES_DIR))

router = APIRouter(include_in_schema=False)


def _ctx(request: Request, user: User | None, **extra) -> dict:
    return {
        "request": request,
        "user": user,
        "settings": settings,
        "stripe_pk": settings.stripe_publishable_key,
        **extra,
    }


@router.get("/", response_class=HTMLResponse)
async def home(
    request: Request,
    user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Product).where(Product.is_active.is_(True)).limit(1)
    )
    hero_product = result.scalar_one_or_none()
    return templates.TemplateResponse(
        "index.html", _ctx(request, user, hero_product=hero_product)
    )


@router.get("/catalog", response_class=HTMLResponse)
async def catalog_page(
    request: Request, user: User | None = Depends(get_current_user_optional)
):
    return templates.TemplateResponse("catalog.html", _ctx(request, user))


@router.get("/products/{slug}", response_class=HTMLResponse)
async def product_page(
    request: Request,
    slug: str,
    user: User | None = Depends(get_current_user_optional),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(Product).where(Product.slug == slug))
    product = result.scalar_one_or_none()
    return templates.TemplateResponse(
        "product.html", _ctx(request, user, product=product), status_code=200 if product else 404
    )


@router.get("/login", response_class=HTMLResponse)
async def login_page(request: Request):
    return templates.TemplateResponse("login.html", _ctx(request, None))


@router.get("/register", response_class=HTMLResponse)
async def register_page(request: Request, ref: str | None = None):
    return templates.TemplateResponse("register.html", _ctx(request, None, ref=ref))


@router.get("/dashboard", response_class=HTMLResponse)
async def dashboard_page(
    request: Request, user: User | None = Depends(get_current_user_optional)
):
    return templates.TemplateResponse("dashboard.html", _ctx(request, user))
