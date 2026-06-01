# Asset Requirements

Amir to supply product images and branding. Exact specs below so the build
drops them in cleanly.

## Hero product (signature "particle burst")

| Asset | Spec |
|-------|------|
| Hero product image | **High-res PNG, transparent background**, 1024×1024 or larger, centered package, even lighting. |
| (Optional) 3D model | `.glb` / `.gltf`, **low-poly** (< ~50k tris), compressed textures (KTX2/WebP), single mesh preferred. |

The hero accepts a PNG and fakes dimensionality via lighting + instancing.
A real `.glb` looks better but is optional. To convert a PNG → low-poly model
cheaply, use **Tripo 3D** or **Meshy** (free tiers; Tripo Pro ≈ $20/mo for
~3,000 credits, ~30–50 credits/model — 5 products is trivially cheap).

Set on the product record:
- `image_url` — PNG (used by hero + product viewer fallback).
- `model_url` — `.glb`/`.gltf` (used by the 3D viewer when present).

## Catalog / product shots

| Asset | Spec |
|-------|------|
| Catalog thumbnails | **Consistent dimensions**, square (1:1) or 4:3, ≥ 800px, WebP or PNG. |
| Detail images | Same aspect across products for a clean grid. |

## Branding

| Asset | Spec |
|-------|------|
| Logo | SVG preferred (scales + glows cleanly), plus PNG fallback on transparent bg. |
| Wordmark / favicon | SVG + 512px PNG. |
| Style reference | Any existing brand colors/fonts so we can tune the design tokens in `app/static/css/style.css` (`--green-glow`, `--green-neon`, `--bg`). |

## Where assets live

- **Upload via the admin UI:** `/admin/products/new` (or edit) has image and
  3D-model upload fields. Files are validated (type + size: images ≤ 8 MB,
  models ≤ 25 MB), stored under `app/static/uploads/` (gitignored), and the
  resulting `/static/uploads/<file>` URL is saved on the product
  (`image_url` / `model_url`). Backed by `POST /api/admin/uploads?kind=image|model`.
- For production, prefer object storage (S3/Cloudflare R2) + CDN: swap the
  `app/services/uploads.py` save step to push to your bucket and return the CDN
  URL — nothing else changes.
