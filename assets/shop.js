// Prices and «Купить» on the main page. The buyer signs in with Google (the same button as for reviews);
// the server makes the order and sends to the payment page; after the payment the plan is on that account.
(function () {
  var api = window.NEXUS_CHAT || "", list = document.getElementById("plans-list");
  if (!api || !list) return;
  var signin = document.getElementById("buy-signin"), note = document.getElementById("buy-note"), wanted = "";
  var short = { "1m": "1 месяц", "3m": "3 месяца", "1y": "1 год" };

  // «Купить»: the plan, its price and «Оплатить». Until the payment service is on, the button still works
  // and says that paying is not available yet.
  function choose(p, ready) {
    var old = document.getElementById("buy-choice");
    if (old) old.remove();
    var box = document.createElement("div");
    box.id = "buy-choice";
    box.className = "buy-choice";
    box.innerHTML = '<div class="card"><button class="chat-x" aria-label="Закрыть">×</button>' +
      '<div class="who">Подписка NEXUS</div><b class="plan-name"></b>' +
      '<div class="price"><s class="old"></s><span></span></div>' +
      '<div class="cta"><button class="btn pay">Оплатить</button></div><div class="form-note"></div></div>';
    box.querySelector(".plan-name").textContent = short[p.id];
    box.querySelector(".price span").textContent = p.price + " ₽";
    if (p.old) box.querySelector(".old").textContent = p.old + " ₽";
    var msg = box.querySelector(".form-note");
    box.querySelector(".pay").onclick = function () {
      if (!ready) { msg.textContent = "Оплата пока недоступна — скоро заработает."; return; }
      box.remove();
      buy(p.id);
    };
    box.querySelector(".chat-x").onclick = function () { box.remove(); };
    box.onclick = function (e) { if (e.target === box) box.remove(); };
    document.body.appendChild(box);
  }

  function buy(product) {
    if (!window.NEXUS_TOKEN) {
      wanted = product;
      signin.hidden = false;
      if (window.nexusGoogleInit) window.nexusGoogleInit();
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
      c.innerHTML = '<div class="name"></div><div class="price"><s class="old"></s><span></span></div>'
        + '<div class="features">Весь NEXUS · ПК и телефон · Облако</div>';
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
      b.className = "btn";
      b.textContent = "Купить";
      b.onclick = function () { choose(p, d.ready); };
      c.appendChild(b);
      list.appendChild(c);
    });
  }).catch(function () {});
})();

// Страница «Скачать»: ссылки берутся с сервера — что выложено в панели, то и можно скачать.
(function () {
  var api = window.NEXUS_CHAT || "";
  var cards = document.querySelectorAll("[data-dl]");
  if (!api || !cards.length) return;
  fetch(api + "/downloads").then(function (r) { return r.json(); }).then(function (d) {
    Array.prototype.forEach.call(cards, function (card) {
      var item = (d.releases || {})[card.getAttribute("data-dl")];
      var slot = card.querySelector(".soon") || card.querySelector(".btn");
      if (!item || !slot) return;
      var a = document.createElement("a");
      a.className = "btn";
      a.href = api + "/dl/" + card.getAttribute("data-dl");
      a.innerHTML = slot.innerHTML.indexOf("svg") >= 0 ? slot.innerHTML : "Скачать";
      a.appendChild(document.createTextNode(" " + item.version));
      slot.parentNode.replaceChild(a, slot);
    });
  }).catch(function () {});
})();
