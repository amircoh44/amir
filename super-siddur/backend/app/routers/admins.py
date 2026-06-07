"""Admin management (super admins only)."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..config import get_settings
from ..db import get_db
from ..models import Admin
from ..schemas import AdminCreate, AdminOut, AdminUpdate
from ..security import (admin_permissions, get_admin_by_email, hash_password,
                        require_superadmin)

router = APIRouter(prefix="/api/admins", tags=["admins"])


def _out(a: Admin) -> AdminOut:
    return AdminOut(id=a.id, email=a.email, name=a.name, role=a.role,
                    permissions=admin_permissions(a), active=a.active)


@router.get("", response_model=list[AdminOut])
def list_admins(db: Session = Depends(get_db),
                _: Admin = Depends(require_superadmin)) -> list[AdminOut]:
    return [_out(a) for a in db.scalars(select(Admin)).all()]


@router.post("", response_model=AdminOut)
def create_admin(body: AdminCreate, db: Session = Depends(get_db),
                 _: Admin = Depends(require_superadmin)) -> AdminOut:
    if get_admin_by_email(db, body.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "email already exists")
    a = Admin(email=body.email.lower(), name=body.name, password_hash=hash_password(body.password),
              role="superadmin" if body.role == "superadmin" else "editor",
              permissions=body.permissions)
    db.add(a)
    db.commit()
    return _out(a)


@router.patch("/{admin_id}", response_model=AdminOut)
def update_admin(admin_id: int, body: AdminUpdate, db: Session = Depends(get_db),
                 _: Admin = Depends(require_superadmin)) -> AdminOut:
    a = db.get(Admin, admin_id)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "admin not found")
    if body.name is not None:
        a.name = body.name
    if body.password:
        a.password_hash = hash_password(body.password)
    if body.role is not None:
        a.role = "superadmin" if body.role == "superadmin" else "editor"
    if body.permissions is not None:
        a.permissions = body.permissions
    if body.active is not None:
        a.active = body.active
    db.commit()
    return _out(a)


@router.delete("/{admin_id}")
def delete_admin(admin_id: int, db: Session = Depends(get_db),
                 _: Admin = Depends(require_superadmin)) -> dict:
    a = db.get(Admin, admin_id)
    if not a:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "admin not found")
    if a.email.lower() in get_settings().superadmin_list:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "cannot delete a seeded super admin")
    db.delete(a)
    db.commit()
    return {"ok": True}
