"""Server-rendered pages (Jinja2). The JSON API under /api powers interactivity."""

from __future__ import annotations

from pathlib import Path

from fastapi import APIRouter, Depends, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.templating import Jinja2Templates
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user_optional
from app.models import Product, User, UserRole

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


# --- Admin pages -------------------------------------------------------------
# These are thin shells; the page JS calls the admin JSON API (which enforces
# require_admin via the session cookie). We still gate the page render so
# non-admins are redirected rather than shown an empty admin chrome.
def _admin_guard(user: User | None):
    if user is None:
        return RedirectResponse("/login", status_code=302)
    if user.role != UserRole.admin:
        return RedirectResponse("/dashboard", status_code=302)
    return None


def _admin_page(template: str, request: Request, user: User | None, **extra):
    redirect = _admin_guard(user)
    if redirect is not None:
        return redirect
    return templates.TemplateResponse(template, _ctx(request, user, **extra))


@router.get("/admin", response_class=HTMLResponse)
async def admin_dashboard(request: Request, user: User | None = Depends(get_current_user_optional)):
    return _admin_page("admin/dashboard.html", request, user)


@router.get("/admin/products", response_class=HTMLResponse)
async def admin_products(request: Request, user: User | None = Depends(get_current_user_optional)):
    return _admin_page("admin/products.html", request, user)


@router.get("/admin/products/new", response_class=HTMLResponse)
async def admin_product_new(
    request: Request, user: User | None = Depends(get_current_user_optional)
):
    return _admin_page("admin/product_form.html", request, user, product_id=None)


@router.get("/admin/products/{product_id}/edit", response_class=HTMLResponse)
async def admin_product_edit(
    product_id: int, request: Request, user: User | None = Depends(get_current_user_optional)
):
    return _admin_page("admin/product_form.html", request, user, product_id=product_id)


@router.get("/admin/orders", response_class=HTMLResponse)
async def admin_orders(request: Request, user: User | None = Depends(get_current_user_optional)):
    return _admin_page("admin/orders.html", request, user)


@router.get("/admin/customers", response_class=HTMLResponse)
async def admin_customers(request: Request, user: User | None = Depends(get_current_user_optional)):
    return _admin_page("admin/customers.html", request, user)


@router.get("/admin/quotes", response_class=HTMLResponse)
async def admin_quotes_page(
    request: Request, user: User | None = Depends(get_current_user_optional)
):
    return _admin_page("admin/quotes.html", request, user)
