"""Pydantic request/response schemas."""
from __future__ import annotations

from typing import Any

from pydantic import BaseModel, EmailStr, Field


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"


class AdminOut(BaseModel):
    id: int
    email: str
    name: str
    role: str
    permissions: list[str]
    active: bool

    class Config:
        from_attributes = True


class AdminCreate(BaseModel):
    email: EmailStr
    name: str = ""
    password: str = Field(min_length=8)
    role: str = "editor"
    permissions: list[str] = []


class AdminUpdate(BaseModel):
    name: str | None = None
    password: str | None = Field(default=None, min_length=8)
    role: str | None = None
    permissions: list[str] | None = None
    active: bool | None = None


class SettingIn(BaseModel):
    value: dict[str, Any]


class IconOut(BaseModel):
    key: str
    label: str
    kind: str
    content_type: str
    has_svg: bool
    url: str

    class Config:
        from_attributes = True
