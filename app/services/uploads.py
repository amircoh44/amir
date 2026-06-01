"""Validated media uploads for product images and 3D models.

Files are stored under ``app/static/uploads`` and served at ``/static/uploads``.
For production, front this with object storage (S3/R2) + CDN and store the CDN
URL on the product instead — the returned URL is the only thing callers depend on.
"""

from __future__ import annotations

import secrets
from pathlib import Path

from fastapi import HTTPException, UploadFile, status

STATIC_UPLOADS = Path(__file__).resolve().parents[1] / "static" / "uploads"

IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".webp"}
MODEL_EXTS = {".glb", ".gltf"}
MAX_IMAGE_BYTES = 8 * 1024 * 1024     # 8 MB
MAX_MODEL_BYTES = 25 * 1024 * 1024    # 25 MB
CHUNK = 1024 * 1024


def _ext(filename: str) -> str:
    return Path(filename or "").suffix.lower()


async def save_upload(file: UploadFile, kind: str) -> str:
    """Validate and persist an upload. ``kind`` is "image" or "model".

    Returns the public URL path (e.g. ``/static/uploads/ab12cd.png``).
    """
    allowed = IMAGE_EXTS if kind == "image" else MODEL_EXTS
    max_bytes = MAX_IMAGE_BYTES if kind == "image" else MAX_MODEL_BYTES

    ext = _ext(file.filename)
    if ext not in allowed:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            f"Unsupported {kind} type '{ext or '?'}'. Allowed: {', '.join(sorted(allowed))}",
        )

    STATIC_UPLOADS.mkdir(parents=True, exist_ok=True)
    name = f"{secrets.token_hex(16)}{ext}"
    dest = STATIC_UPLOADS / name

    written = 0
    try:
        with dest.open("wb") as out:
            while chunk := await file.read(CHUNK):
                written += len(chunk)
                if written > max_bytes:
                    raise HTTPException(
                        status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                        f"{kind.title()} exceeds {max_bytes // (1024 * 1024)} MB limit",
                    )
                out.write(chunk)
    except HTTPException:
        dest.unlink(missing_ok=True)
        raise

    return f"/static/uploads/{name}"
