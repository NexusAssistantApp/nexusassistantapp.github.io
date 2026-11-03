// Prices and «Купить» on the main page. The buyer signs in with Google (the same button as for reviews);
// the server makes the order and sends to the payment page; after the payment the plan is on that account.
(function () {
  var api = window.NEXUS_CHAT || "", list = document.getElementById("plans-list");
  if (!api || !list) return;
  var signin = document.getElementById("buy-signin"), note = document.getElementById("buy-note"), wanted = "";
  var short = { "1m": "1 месяц", "3m": "3 месяца", "1y": "1 год" };

  function buy(product) {
    if (!window.NEXUS_TOKEN) {
      wanted = product;
      signin.hidden = false;
      if (window.google && window.google.accounts) {
        window.google.accounts.id.renderButton(signin.querySelector(".gbutton"),
          { theme: "filled_black", size: "large", text: "signin_with", locale: "ru" });
      }
      signin.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
    note.textContent = "Открываю оплату…";
    fetch(api + "/pay/create", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ product: product, id_token: window.NEXUS_TOKEN }) })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (d.ok && d.url) location.href = d.url; else note.textContent = d.error || "Не получилось."; })
      .catch(function () { note.textContent = "Нет связи. Попробуй позже."; });
  }

  document.addEventListener("nexus-google", function () {
    signin.hidden = true;
    if (wanted) { var p = wanted; wanted = ""; buy(p); }
  });

  fetch(api + "/pay/prices").then(function (r) { return r.json(); }).then(function (d) {
    var plans = (d.products || []).filter(function (p) { return short[p.id]; });
    if (!plans.length) return;
    list.innerHTML = "";
    var sale = document.getElementById("plans-sale");
    if (sale) { sale.textContent = d.sale || ""; sale.hidden = !d.sale; }
    plans.forEach(function (p) {
      var c = document.createElement("div");
      c.className = "card plan";
      c.innerHTML = '<div class="name"></div><div class="price"><s class="old"></s><span></span></div>';
      c.querySelector(".name").textContent = short[p.id];
      c.querySelector(".price span").textContent = p.price + " ₽";
      if (p.old) {
        c.querySelector(".old").textContent = p.old + " ₽";
        var off = document.createElement("span");
        off.className = "badge";
        off.textContent = "−" + Math.round(100 - p.price * 100 / p.old) + "%";
        c.insertBefore(off, c.firstChild);
      }
      var b = document.createElement("button");
      b.className = d.ready ? "btn" : "btn ghost soon";
      b.textContent = d.ready ? "Купить" : "Скоро";
      b.disabled = !d.ready;
      b.onclick = function () { buy(p.id); };
      c.appendChild(b);
      list.appendChild(c);
    });
  }).catch(function () {});
})();
