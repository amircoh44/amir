/* Lightweight client glue: auth forms, catalog filtering, cart actions.
   No framework — talks to the JSON API and renders into the page. */

const api = {
  async req(method, url, body) {
    const opts = { method, headers: { "Content-Type": "application/json" }, credentials: "same-origin" };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(url, opts);
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.detail || res.statusText);
    return data;
  },
  get(u) { return this.req("GET", u); },
  post(u, b) { return this.req("POST", u, b); },
};

const money = (cents) => `$${(cents / 100).toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

// --- Auth forms --------------------------------------------------------------
function bindAuthForm(formId, endpoint) {
  const form = document.getElementById(formId);
  if (!form) return;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const err = form.querySelector(".form-error");
    if (err) err.textContent = "";
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      await api.post(endpoint, payload);
      window.location.href = "/dashboard";
    } catch (ex) {
      if (err) err.textContent = ex.message;
    }
  });
}

// --- Catalog -----------------------------------------------------------------
function productCard(p) {
  const tierNote = p.price_tiers.length ? ` · ${p.price_tiers.length} bulk tiers` : "";
  return `
    <a class="card" href="/products/${p.slug}">
      <div class="thumb">${p.image_url ? `<img src="${p.image_url}" alt="${p.name}">` : "📦"}</div>
      <div class="body">
        <p class="name">${p.name}</p>
        <div class="badges">
          <span class="badge">THC ${p.thc_percent}%</span>
          <span class="badge">CBD ${p.cbd_percent}%</span>
          <span class="badge">${p.product_type}</span>
        </div>
        <p class="price">${money(p.base_price_cents)} <small>/ ${p.unit_label}${tierNote}</small></p>
      </div>
    </a>`;
}

async function loadCatalog() {
  const grid = document.getElementById("catalog-grid");
  if (!grid) return;
  const f = document.getElementById("filters");
  const params = new URLSearchParams();
  if (f) {
    new FormData(f).forEach((v, k) => { if (v) params.set(k, v); });
  }
  grid.innerHTML = "<p class='muted'>Loading…</p>";
  try {
    const products = await api.get(`/api/catalog/products?${params}`);
    grid.innerHTML = products.length
      ? products.map(productCard).join("")
      : "<p class='muted'>No products match your filters.</p>";
  } catch (ex) {
    grid.innerHTML = `<p class='muted'>${ex.message}</p>`;
  }
}

// --- Product page: add to cart ----------------------------------------------
function bindAddToCart() {
  const btn = document.getElementById("add-to-cart");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const productId = parseInt(btn.dataset.productId, 10);
    const qty = parseInt(document.getElementById("qty").value, 10) || 1;
    const status = document.getElementById("cart-status");
    try {
      await api.post("/api/cart/items", { product_id: productId, quantity: qty });
      status.textContent = "Added to cart ✓";
    } catch (ex) {
      status.textContent = ex.message;
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindAuthForm("login-form", "/auth/login");
  bindAuthForm("register-form", "/auth/register");
  bindAddToCart();
  loadCatalog();
  const filters = document.getElementById("filters");
  if (filters) filters.addEventListener("input", () => loadCatalog());
});

window.GreenBulk = { api, money };
