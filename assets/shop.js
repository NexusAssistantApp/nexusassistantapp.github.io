// Prices and «Купить» on the main page. The buyer signs in with Google (the same button as for reviews);
// the server makes the order and sends to the payment page; after the payment the plan is on that account.
(function () {
  var api = window.NEXUS_CHAT || "", list = document.getElementById("plans-list");
  var modList = document.getElementById("mods-list");             // the «Модификации» page: paid mods
  if (!api || (!list && !modList)) return;
  var signin = document.getElementById("buy-signin"), note = document.getElementById("buy-note"), wanted = "";
  var short = { "1m": "1 месяц", "3m": "3 месяца", "1y": "1 год" };
  var PLAN_FEATURES = "Весь NEXUS · ПК и телефон · Облако";

  // «Купить»: the plan, its price and «Оплатить». Until the payment service is on, the button still works
  // and says that paying is not available yet.
  function choose(p, ready) {
    var old = document.getElementById("buy-choice");
    if (old) old.remove();
    var box = document.createElement("div");
    box.id = "buy-choice";
    box.className = "buy-choice";
    box.innerHTML = '<div class="card"><button class="chat-x" aria-label="Закрыть">×</button>' +
      '<div class="who"></div><b class="plan-name"></b><p class="buy-desc"></p>' +
      '<div class="price"><s class="old"></s><span></span></div>' +
      '<div class="buy-meta"></div><div class="cta"><button class="btn pay">Оплатить</button></div><div class="form-note"></div></div>';
    box.querySelector(".who").textContent = short[p.id] ? "Подписка NEXUS" : "Модификация";
    box.querySelector(".plan-name").textContent = short[p.id] || p.name;
    box.querySelector(".price span").textContent = p.price + " ₽";
    if (p.old) box.querySelector(".old").textContent = p.old + " ₽";
    // the same words as on the card it was opened from
    var desc = box.querySelector(".buy-desc"), meta = box.querySelector(".buy-meta");
    desc.textContent = p.description || (short[p.id] ? PLAN_FEATURES : "");
    desc.hidden = !desc.textContent;
    meta.textContent = p.meta || "";
    meta.hidden = !meta.textContent;
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
    if (!list || !plans.length) return;
    list.innerHTML = "";
    var sale = document.getElementById("plans-sale");
    if (sale) { sale.textContent = d.sale || ""; sale.hidden = !d.sale; }
    plans.forEach(function (p) {
      var c = document.createElement("div");
      c.className = "card plan";
      c.innerHTML = '<div class="name"></div><div class="price"><s class="old"></s><span></span></div>'
        + '<div class="features"></div>';
      c.querySelector(".features").textContent = PLAN_FEATURES;
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

  // The mods on the server (what the panel has): free ones say so, paid ones have «Купить».
  // Bought here, a mod lands on the Google account and NEXUS puts it in by itself.
  function showMods(mods, ready) {
    modList.innerHTML = "";
    if (!mods.length) {
      var none = document.createElement("p");
      none.className = "sub";
      none.textContent = "Пока пусто.";
      modList.appendChild(none);
      return;
    }
    mods.forEach(function (m) {
      var price = parseInt(m.price, 10) || 0;
      var c = document.createElement("div");
      c.className = "card mod";
      c.innerHTML = '<h3></h3><p></p><div class="mod-foot"><span class="price-tag"></span><span class="who"></span></div>';
      c.querySelector("h3").textContent = m.name || m.id;
      c.querySelector("p").textContent = m.description || "";
      c.querySelector(".price-tag").textContent = price ? price + " ₽" : "Бесплатно";
      var where = { pc: "Только ПК", phone: "Только телефон" }[m.works_on] || "ПК и телефон";
      var meta = where + (m.version ? " · v" + m.version : "");
      c.querySelector(".who").textContent = meta;
      if (price) {
        var b = document.createElement("button");
        b.className = "btn";
        b.textContent = "Купить";
        b.onclick = function () { choose({ id: "mod:" + m.id, name: m.name || m.id, price: price,
                                          description: m.description || "", meta: meta }, ready); };
        c.querySelector(".mod-foot").appendChild(b);
      }
      modList.appendChild(c);
    });
  }
  if (modList) {
    Promise.all([
      fetch(api + "/mods").then(function (r) { return r.json(); }),
      fetch(api + "/pay/prices").then(function (r) { return r.json(); }).catch(function () { return {}; })
    ]).then(function (both) { showMods(both[0].mods || [], !!both[1].ready); })
      .catch(function () { modList.innerHTML = '<p class="sub">Список сейчас недоступен.</p>'; });
  }
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
