// Панель → «Модификации»: магазин в NEXUS — выложить, изменить, убрать.
(function () {
  var P = window.nexusPanel;
  if (!P) return;
  var el = P.el, clear = P.clear, ask = P.ask, fail = P.fail, human = P.human;

  // Где работает модификация: не каждая подходит и ПК, и телефону.
  var PLACES = [["both", "ПК и телефон"], ["pc", "Только ПК"], ["phone", "Только телефон"]];
  function placePicker(value) {
    var s = el("select", "input");
    PLACES.forEach(function (p) {
      var o = el("option", null, p[1]);
      o.value = p[0];
      if (p[0] === (value || "both")) o.selected = true;
      s.appendChild(o);
    });
    return s;
  }
  function placeName(value) {
    var p = PLACES.filter(function (x) { return x[0] === (value || "both"); })[0];
    return p ? p[1] : PLACES[0][1];
  }

  function modCard(onReady) {
    var c = P.card("Новая модификация");
    var file = P.picker(".zip");
    c.appendChild(P.row("Пакет (.zip с plugin.json внутри)", file));
    var info = el("div", "mod-info");
    c.appendChild(info);
    var name = P.input("Название"), version = P.input("1.0"), price = P.input("Цена, ₽ (0 — бесплатно)", "0"),
        desc = P.area("Описание"), place = placePicker("both");
    var read = function () {
      if (!file.files[0]) return;
      info.textContent = "Читаю пакет…";
      P.upload("mod", file.files[0]).then(function () { return ask("mod_info"); }).then(function (d) {
        if (!d.ok) { info.textContent = d.error; return; }
        name.value = d.name; version.value = d.version; desc.value = d.description || "";
        info.textContent = "id: " + d.id + " · " + human(d.size);
      }).catch(function () { info.textContent = "Пакет не загрузился."; });
    };
    file.onchange = read;
    var rows = el("div", "mod-form");
    rows.appendChild(P.row("Название", name));
    rows.appendChild(P.row("Версия", version));
    rows.appendChild(P.row("Цена, ₽", price));
    rows.appendChild(P.row("Где работает", place));
    rows.appendChild(P.row("Описание", desc));
    c.appendChild(rows);
    var note = el("p", "note");
    c.appendChild(note);
    var go = el("button", "btn", "Выложить");
    c.appendChild(go);
    go.onclick = function () {
      var card = { id: "", name: name.value.trim(), version: version.value.trim(),
                   description: desc.value.trim(), price: Math.max(0, parseInt(price.value, 10) || 0),
                   works_on: place.value };
      go.disabled = true;
      P.say(note, "Подписываю…");
      // id, sha256 и размер приходят с сервера — карточка подписывается на уже загруженный файл
      ask("mod_info").then(function (d) {
        if (!d.ok) throw new Error(d.error || "Сначала выбери пакет.");
        card.id = d.id; card.sha256 = d.sha256; card.size = d.size;
        if (!card.name) card.name = d.name;
        return P.sign(card, ["description", "id", "name", "price", "sha256", "size", "version"]);
      }).then(function (signature) {
        card.signature = signature;
        P.say(note, "Выкладываю…");
        return ask("mod_add", { card: card });
      }).then(function (d) {
        go.disabled = false;
        if (!d.ok) return P.say(note, d.error || "Не вышло.", true);
        P.say(note, "Готово — видно в магазине NEXUS.");
        onReady();
      }).catch(function (e) {
        go.disabled = false;
        P.say(note, e.message === "нет ключа" ? "Сначала добавь ключ обновлений." : (e.message || "Не вышло."), true);
      });
    };
    return c;
  }

  function item(mod, reload) {
    var c = el("div", "card mod-row");
    var head = el("div", "mod-head");
    head.appendChild(el("b", null, mod.name + " "));
    head.appendChild(el("span", "note", mod.id + " · " + mod.version + " · " + human(mod.size) + " · " +
                                         placeName(mod.works_on)));
    var price = el("span", "price-tag", mod.price ? mod.price + " ₽" : "бесплатно");
    head.appendChild(price);
    c.appendChild(head);
    var desc = P.area("Описание", mod.description || "");
    c.appendChild(desc);
    var row = el("div", "panel-line");
    var priceIn = P.input("Цена, ₽", String(mod.price || 0));
    priceIn.style.maxWidth = "140px";
    row.appendChild(priceIn);
    var placeIn = placePicker(mod.works_on);
    placeIn.style.maxWidth = "180px";
    row.appendChild(placeIn);
    var save = el("button", "btn small", "Сохранить");
    var del = el("button", "btn ghost small", "Удалить");
    var get = el("button", "btn ghost small", "Скачать");
    row.appendChild(save);
    row.appendChild(get);
    row.appendChild(del);
    c.appendChild(row);
    var note = el("p", "note");
    c.appendChild(note);
    save.onclick = function () {
      save.disabled = true;
      var card = { id: mod.id, name: mod.name, version: mod.version, description: desc.value.trim(),
                   price: Math.max(0, parseInt(priceIn.value, 10) || 0), sha256: mod.sha256, size: mod.size,
                   works_on: placeIn.value };
      P.sign(card, ["description", "id", "name", "price", "sha256", "size", "version"]).then(function (signature) {
        card.signature = signature;
        return ask("mod_update", { card: card });
      }).then(function (d) {
        save.disabled = false;
        P.say(note, d.ok ? "Сохранено." : (d.error || "Не вышло."), !d.ok);
        if (d.ok) reload();
      }).catch(function (e) {
        save.disabled = false;
        P.say(note, e.message === "нет ключа" ? "Добавь ключ обновлений выше." : (e.message || "Не вышло."), true);
      });
    };
    // Создатель скачивает свою модификацию, чтобы проверить, — без покупки.
    get.onclick = function () {
      get.disabled = true;
      P.say(note, "Скачиваю…");
      ask("mod_download", { id: mod.id }).then(function (d) {
        get.disabled = false;
        if (!d.ok) return P.say(note, d.error || "Не вышло.", true);
        var bin = atob(d.data), bytes = new Uint8Array(bin.length);
        for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
        var url = URL.createObjectURL(new Blob([bytes], { type: "application/octet-stream" }));
        var a = document.createElement("a");
        a.href = url; a.download = d.name;
        document.body.appendChild(a); a.click(); a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
        P.say(note, "Скачано: " + d.name);
      }).catch(function () { get.disabled = false; P.say(note, "Нет связи.", true); });
    };
    del.onclick = function () {
      if (!window.confirm("Убрать «" + mod.name + "» из магазина?")) return;
      ask("mod_delete", { id: mod.id }).then(function (d) {
        if (!d.ok) P.say(note, d.error || "Не вышло.", true);
        else reload();
      }).catch(function () { P.say(note, "Нет связи.", true); });
    };
    return c;
  }

  window.nexusPanelPages.mods = function (body) {
    Promise.all([ask("mods_all")]).then(function (r) {
      clear(body);
      var reload = function () { window.nexusPanelPages.mods(body); };
      body.appendChild(P.keyCard());
      body.appendChild(modCard(reload));
      var list = el("div");
      var mods = (r[0] && r[0].mods) || [];
      if (!mods.length) list.appendChild(el("div", "empty", "Модификаций пока нет."));
      mods.forEach(function (m) { list.appendChild(item(m, reload)); });
      body.appendChild(list);
    }).catch(function () { fail(body, "Нет связи с сервером."); });
  };
})();
