/* Admin backend glue — drives the server-rendered admin pages off the
   /api/admin/* JSON API (auth via the session cookie). */
(function () {
  const { api, money } = window.GreenBulk;

  function toast(msg, isError) {
    const el = document.getElementById("toast");
    if (!el) return alert(msg);
    el.textContent = msg;
    el.classList.toggle("error", !!isError);
    el.classList.add("show");
    setTimeout(() => el.classList.remove("show"), 2600);
  }

  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const pill = (text, cls) => `<span class="pill ${cls}">${esc(text)}</span>`;
  const verifyClass = (s) => ({ approved: "ok", pending: "warn", rejected: "bad", suspended: "bad" }[s] || "muted");
  const orderClass = (s) => ({ paid: "ok", delivered: "ok", shipped: "ok", pending: "warn", processing: "warn", cancelled: "bad", refunded: "bad" }[s] || "muted");

  // --- Dashboard -------------------------------------------------------------
  async function loadDashboard() {
    const stats = document.getElementById("stats");
    if (!stats) return;
    try {
      const d = await api.get("/api/admin/analytics?days=30");
      stats.innerHTML = `
        <div class="stat"><div class="label">Revenue (30d)</div><div class="value glow">${money(d.revenue.revenue_cents)}</div></div>
        <div class="stat"><div class="label">Paid orders (30d)</div><div class="value">${d.revenue.paid_orders}</div></div>
        <div class="stat"><div class="label">Avg order value</div><div class="value">${money(d.revenue.average_order_value_cents)}</div></div>`;
      document.getElementById("top-products").innerHTML = d.top_products.length
        ? d.top_products.map(p => `<tr><td>${esc(p.product_name)}</td><td>${p.units}</td><td>${money(p.revenue_cents)}</td></tr>`).join("")
        : `<tr><td colspan="3" class="muted">No paid orders yet.</td></tr>`;
      document.getElementById("top-customers").innerHTML = d.top_customers.length
        ? d.top_customers.map(c => `<tr><td>${esc(c.business_name || c.email)}</td><td>${c.orders}</td><td>${money(c.spent_cents)}</td></tr>`).join("")
        : `<tr><td colspan="3" class="muted">No customers yet.</td></tr>`;
    } catch (e) { toast(e.message, true); }
  }

  // --- Products list ---------------------------------------------------------
  async function loadProducts() {
    const tbody = document.getElementById("products-rows");
    if (!tbody) return;
    try {
      const products = await api.get("/api/admin/products");
      tbody.innerHTML = products.length ? products.map(p => `
        <tr>
          <td>${p.image_url ? `<img class="thumb-sm" src="${esc(p.image_url)}">` : "📦"}</td>
          <td>${esc(p.name)}<br><span class="muted" style="font-size:.78rem">${esc(p.product_type)} · ${p.model_url ? "3D ✓" : "no 3D"}</span></td>
          <td>${p.thc_percent}% / ${p.cbd_percent}%</td>
          <td>${money(p.base_price_cents)} <span class="muted">/ ${esc(p.unit_label)}</span><br><span class="muted" style="font-size:.78rem">${p.price_tiers.length} tiers</span></td>
          <td>${p.stock_qty}</td>
          <td>${p.is_active ? pill("active", "ok") : pill("inactive", "muted")}</td>
          <td class="row-actions">
            <a class="btn btn-ghost btn-sm" href="/admin/products/${p.id}/edit">Edit</a>
            ${p.is_active ? `<button class="btn btn-ghost btn-sm" data-deactivate="${p.id}">Deactivate</button>` : ""}
          </td>
        </tr>`).join("") : `<tr><td colspan="7" class="muted">No products yet. <a href="/admin/products/new">Add one</a>.</td></tr>`;

      tbody.querySelectorAll("[data-deactivate]").forEach(btn => btn.addEventListener("click", async () => {
        if (!confirm("Deactivate this product? Order history is preserved.")) return;
        try { await api.req("DELETE", `/api/admin/products/${btn.dataset.deactivate}`); toast("Deactivated"); loadProducts(); }
        catch (e) { toast(e.message, true); }
      }));
    } catch (e) { toast(e.message, true); }
  }

  // --- Product form (create + edit, with image/model upload) -----------------
  function tierRow(qty, price) {
    const div = document.createElement("div");
    div.className = "tier-row";
    div.innerHTML = `
      <input class="inline" type="number" placeholder="Min qty" value="${qty ?? ""}" data-tier-qty style="width:120px">
      <span class="muted">+ units →</span>
      <input class="inline" type="number" step="0.01" placeholder="$ / unit" value="${price != null ? (price / 100) : ""}" data-tier-price style="width:140px">
      <button type="button" class="btn btn-ghost btn-sm" data-remove>✕</button>`;
    div.querySelector("[data-remove]").addEventListener("click", () => div.remove());
    return div;
  }

  async function uploadField(inputId, kind, hiddenId, previewId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener("change", async () => {
      if (!input.files.length) return;
      const fd = new FormData();
      fd.append("file", input.files[0]);
      try {
        const res = await fetch(`/api/admin/uploads?kind=${kind}`, { method: "POST", body: fd, credentials: "same-origin" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.detail || "Upload failed");
        document.getElementById(hiddenId).value = data.url;
        const prev = document.getElementById(previewId);
        prev.innerHTML = kind === "image" ? `<img src="${data.url}">` : `<span class="muted">Model: ${data.url}</span>`;
        toast("Uploaded ✓");
      } catch (e) { toast(e.message, true); }
    });
  }

  async function initProductForm() {
    const form = document.getElementById("product-form");
    if (!form) return;
    const productId = form.dataset.productId || "";
    const tiersWrap = document.getElementById("tiers");

    document.getElementById("add-tier").addEventListener("click", () => tiersWrap.appendChild(tierRow()));
    uploadField("image-file", "image", "image_url", "image-preview");
    uploadField("model-file", "model", "model_url", "model-preview");

    if (productId) {
      try {
        const p = await api.get(`/api/admin/products/${productId}`);
        for (const [k, v] of Object.entries(p)) {
          const el = form.elements[k];
          if (el && el.type === "checkbox") el.checked = !!v;
          else if (el) el.value = v ?? "";
        }
        if (p.image_url) document.getElementById("image-preview").innerHTML = `<img src="${esc(p.image_url)}">`;
        if (p.model_url) document.getElementById("model-preview").innerHTML = `<span class="muted">Model: ${esc(p.model_url)}</span>`;
        p.price_tiers.forEach(t => tiersWrap.appendChild(tierRow(t.min_qty, t.unit_price_cents)));
      } catch (e) { toast(e.message, true); }
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(form);
      const payload = {
        name: fd.get("name"),
        description: fd.get("description") || null,
        product_type: fd.get("product_type"),
        strain: fd.get("strain") || null,
        thc_percent: parseFloat(fd.get("thc_percent") || 0),
        cbd_percent: parseFloat(fd.get("cbd_percent") || 0),
        unit_label: fd.get("unit_label") || "lb",
        base_price_cents: Math.round(parseFloat(fd.get("base_price") || 0) * 100),
        min_order_qty: parseInt(fd.get("min_order_qty") || 1, 10),
        stock_qty: parseInt(fd.get("stock_qty") || 0, 10),
        is_active: form.elements["is_active"].checked,
        image_url: fd.get("image_url") || null,
        model_url: fd.get("model_url") || null,
        price_tiers: [...tiersWrap.querySelectorAll(".tier-row")].map(r => ({
          min_qty: parseInt(r.querySelector("[data-tier-qty]").value, 10),
          unit_price_cents: Math.round(parseFloat(r.querySelector("[data-tier-price]").value) * 100),
        })).filter(t => t.min_qty > 0 && !isNaN(t.unit_price_cents)),
      };
      try {
        if (productId) await api.req("PUT", `/api/admin/products/${productId}`, payload);
        else await api.post("/api/admin/products", payload);
        toast("Saved ✓");
        setTimeout(() => location.href = "/admin/products", 700);
      } catch (e) { toast(e.message, true); }
    });
  }

  // --- Orders ----------------------------------------------------------------
  const ORDER_STATUSES = ["pending", "paid", "processing", "shipped", "delivered", "cancelled", "refunded"];
  async function loadOrders() {
    const tbody = document.getElementById("orders-rows");
    if (!tbody) return;
    try {
      const orders = await api.get("/api/admin/orders");
      tbody.innerHTML = orders.length ? orders.map(o => `
        <tr>
          <td>${esc(o.order_number)}<br><span class="muted" style="font-size:.78rem">${o.items.length} items</span></td>
          <td>${pill(o.status, orderClass(o.status))}</td>
          <td>${pill(o.payment_status, o.payment_status === "paid" ? "ok" : "muted")}</td>
          <td>${money(o.total_cents)}</td>
          <td class="row-actions">
            <select class="inline" data-status="${esc(o.order_number)}">
              ${ORDER_STATUSES.map(s => `<option value="${s}" ${s === o.status ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            <input class="inline" placeholder="Tracking #" value="${esc(o.tracking_number || "")}" data-tracking="${esc(o.order_number)}" style="width:130px">
            <button class="btn btn-primary btn-sm" data-save="${esc(o.order_number)}">Save</button>
          </td>
        </tr>`).join("") : `<tr><td colspan="5" class="muted">No orders yet.</td></tr>`;

      tbody.querySelectorAll("[data-save]").forEach(btn => btn.addEventListener("click", async () => {
        const num = btn.dataset.save;
        const status = tbody.querySelector(`[data-status="${CSS.escape(num)}"]`).value;
        const tracking = tbody.querySelector(`[data-tracking="${CSS.escape(num)}"]`).value || null;
        try { await api.req("PUT", `/api/admin/orders/${num}/status`, { status, tracking_number: tracking }); toast("Order updated ✓"); }
        catch (e) { toast(e.message, true); }
      }));
    } catch (e) { toast(e.message, true); }
  }

  // --- Customers -------------------------------------------------------------
  const VERIFY_STATUSES = ["pending", "approved", "rejected", "suspended"];
  async function loadCustomers() {
    const tbody = document.getElementById("customers-rows");
    if (!tbody) return;
    try {
      const customers = await api.get("/api/admin/customers");
      tbody.innerHTML = customers.length ? customers.map(c => {
        const located = c.latitude != null && c.longitude != null;
        const globeNote = c.show_on_map
          ? (located ? pill("on globe", "ok") : pill("opted-in, no coords", "warn"))
          : pill("hidden", "muted");
        return `
        <tr>
          <td>${esc(c.business_name || "—")}<br><span class="muted" style="font-size:.78rem">${esc(c.email)}</span></td>
          <td>${esc([c.city, c.state].filter(Boolean).join(", ") || "—")}</td>
          <td>${esc(c.role)}</td>
          <td>${pill(c.verification_status, verifyClass(c.verification_status))}</td>
          <td>
            <label style="display:flex;gap:6px;align-items:center;font-size:.82rem">
              <input type="checkbox" data-globe="${c.id}" ${c.show_on_map ? "checked" : ""} style="width:auto;min-width:auto">
              ${globeNote}
            </label>
          </td>
          <td class="row-actions">
            <select class="inline" data-verify="${c.id}">
              ${VERIFY_STATUSES.map(s => `<option value="${s}" ${s === c.verification_status ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            <button class="btn btn-primary btn-sm" data-save="${c.id}">Save</button>
          </td>
        </tr>`; }).join("") : `<tr><td colspan="6" class="muted">No customers yet.</td></tr>`;

      tbody.querySelectorAll("[data-save]").forEach(btn => btn.addEventListener("click", async () => {
        const id = btn.dataset.save;
        const status = tbody.querySelector(`[data-verify="${id}"]`).value;
        try { await api.req("PUT", `/api/admin/customers/${id}/verification`, { status }); toast("Verification updated ✓"); }
        catch (e) { toast(e.message, true); }
      }));

      // Toggle globe visibility instantly; geocodes from the customer's address.
      tbody.querySelectorAll("[data-globe]").forEach(box => box.addEventListener("change", async () => {
        try {
          const res = await api.req("PUT", `/api/admin/customers/${box.dataset.globe}/showcase`, { show_on_map: box.checked });
          toast(box.checked
            ? (res.latitude != null ? "Added to globe ✓" : "Opted in — needs a city/state to place on globe")
            : "Removed from globe");
          loadCustomers();
        } catch (e) { toast(e.message, true); box.checked = !box.checked; }
      }));
    } catch (e) { toast(e.message, true); }
  }

  // --- Quotes ----------------------------------------------------------------
  async function loadQuotes() {
    const tbody = document.getElementById("quotes-rows");
    if (!tbody) return;
    try {
      const quotes = await api.get("/api/admin/quotes");
      tbody.innerHTML = quotes.length ? quotes.map(q => `
        <tr>
          <td>${esc(q.reference)}</td>
          <td>${esc(q.product_description)}<br><span class="muted" style="font-size:.78rem">qty ${q.requested_quantity}</span></td>
          <td>${pill(q.status, q.status === "responded" ? "ok" : "warn")}</td>
          <td class="row-actions">
            <input class="inline" type="number" step="0.01" placeholder="$ / unit" value="${q.quoted_unit_price_cents != null ? q.quoted_unit_price_cents / 100 : ""}" data-price="${esc(q.reference)}" style="width:120px">
            <button class="btn btn-primary btn-sm" data-respond="${esc(q.reference)}">Send quote</button>
          </td>
        </tr>`).join("") : `<tr><td colspan="4" class="muted">No quote requests.</td></tr>`;

      tbody.querySelectorAll("[data-respond]").forEach(btn => btn.addEventListener("click", async () => {
        const ref = btn.dataset.respond;
        const price = parseFloat(tbody.querySelector(`[data-price="${CSS.escape(ref)}"]`).value);
        if (isNaN(price)) return toast("Enter a per-unit price", true);
        try {
          await api.req("PUT", `/api/admin/quotes/${ref}/respond`, { quoted_unit_price_cents: Math.round(price * 100), status: "responded" });
          toast("Quote sent ✓"); loadQuotes();
        } catch (e) { toast(e.message, true); }
      }));
    } catch (e) { toast(e.message, true); }
  }

  document.addEventListener("DOMContentLoaded", () => {
    loadDashboard();
    loadProducts();
    initProductForm();
    loadOrders();
    loadCustomers();
    loadQuotes();
  });
})();
