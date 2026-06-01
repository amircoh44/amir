/* Cart page — renders the buyer's cart and drives quantity/remove/checkout
   against the JSON API. Tier savings are computed server-side and shown here. */
(function () {
  const { api, money } = window.GreenBulk;
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  const els = {
    empty: document.getElementById("cart-empty"),
    table: document.getElementById("cart-table"),
    rows: document.getElementById("cart-rows"),
    summary: document.getElementById("cart-summary"),
    subtotal: document.getElementById("cart-subtotal"),
    savings: document.getElementById("cart-savings"),
    status: document.getElementById("cart-status"),
    checkout: document.getElementById("checkout-btn"),
  };

  function render(cart) {
    const hasItems = cart.items.length > 0;
    els.empty.style.display = hasItems ? "none" : "block";
    els.table.style.display = hasItems ? "table" : "none";
    els.summary.style.display = hasItems ? "block" : "none";
    if (!hasItems) return;

    let savings = 0;
    els.rows.innerHTML = cart.items.map((i) => {
      savings += i.savings_cents || 0;
      const tier = i.unit_price_cents < i.list_unit_price_cents
        ? `<span class="muted" style="text-decoration:line-through">${money(i.list_unit_price_cents)}</span> `
        : "";
      return `
        <tr data-pid="${i.product_id}">
          <td>${esc(i.name)}<br><span class="muted" style="font-size:.78rem">per ${esc(i.unit_label)}</span></td>
          <td>${tier}${money(i.unit_price_cents)}</td>
          <td>
            <input class="inline qty" type="number" min="1" value="${i.quantity}" style="width:90px">
          </td>
          <td>${money(i.line_total_cents)}</td>
          <td><button class="btn btn-ghost btn-sm remove">✕</button></td>
        </tr>`;
    }).join("");

    els.subtotal.textContent = money(cart.subtotal_cents);
    els.savings.textContent = savings > 0 ? `− ${money(savings)}` : "—";

    els.rows.querySelectorAll("tr").forEach((tr) => {
      const pid = tr.dataset.pid;
      tr.querySelector(".qty").addEventListener("change", async (e) => {
        const quantity = parseInt(e.target.value, 10);
        if (!quantity || quantity < 1) return;
        try { render(await api.req("PUT", `/api/cart/items/${pid}`, { product_id: +pid, quantity })); }
        catch (ex) { els.status.textContent = ex.message; }
      });
      tr.querySelector(".remove").addEventListener("click", async () => {
        try { render(await api.req("DELETE", `/api/cart/items/${pid}`)); }
        catch (ex) { els.status.textContent = ex.message; }
      });
    });
  }

  async function load() {
    try { render(await api.get("/api/cart")); }
    catch (ex) { els.status.textContent = ex.message; }
  }

  if (els.checkout) {
    els.checkout.addEventListener("click", async () => {
      els.checkout.disabled = true;
      els.status.textContent = "Creating your order…";
      try {
        const res = await api.post("/api/checkout");
        if (res.checkout_url) {
          window.location.href = res.checkout_url;          // Stripe hosted page
        } else {
          // Dev / no-Stripe path: order created without a payment page.
          window.location.href = `/checkout/success?order=${encodeURIComponent(res.order_number)}`;
        }
      } catch (ex) {
        els.status.textContent = ex.message;
        els.checkout.disabled = false;
      }
    });
  }

  document.addEventListener("DOMContentLoaded", load);
})();
