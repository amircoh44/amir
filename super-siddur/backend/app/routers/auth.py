"""Authentication routes."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import Admin
from ..schemas import AdminOut, LoginIn, TokenOut
from ..security import (admin_permissions, create_token, current_admin,
                        get_admin_by_email, verify_password)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/login", response_model=TokenOut)
def login(body: LoginIn, db: Session = Depends(get_db)) -> TokenOut:
    admin = get_admin_by_email(db, body.email)
    if not admin or not admin.active or not verify_password(body.password, admin.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password")
    return TokenOut(access_token=create_token(admin))


@router.get("/me", response_model=AdminOut)
def me(admin: Admin = Depends(current_admin)) -> AdminOut:
    return AdminOut(id=admin.id, email=admin.email, name=admin.name, role=admin.role,
                    permissions=admin_permissions(admin), active=admin.active)
