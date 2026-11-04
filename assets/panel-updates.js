// Панель → «Версии»: новые сборки NEXUS для ПК, iPhone и Android.
(function () {
  var P = window.nexusPanel;
  if (!P) return;
  var el = P.el, clear = P.clear, ask = P.ask, fail = P.fail, human = P.human;

  function progress() {
    var bar = el("div", "bar");
    bar.appendChild(el("i"));
    return bar;
  }
  function setBar(bar, percent) {
    bar.style.display = percent ? "block" : "none";
    bar.firstChild.style.width = percent + "%";
  }

  function pcCard(now, reload) {
    var c = P.card("NEXUS для компьютера");
    c.appendChild(el("p", "note", now ? "Сейчас выложена " + now.version + " · " + human(now.size || 0)
                                      : "Пока ничего не выложено."));
    var file = P.picker(".zip"), version = P.input("1.0.6"), notes = P.area("Что нового");
    c.appendChild(P.row("Сборка (.zip)", file));
    c.appendChild(P.row("Версия", version));
    c.appendChild(P.row("Что нового", notes));
    var bar = progress();
    setBar(bar, 0);
    c.appendChild(bar);
    var note = el("p", "note");
    c.appendChild(note);
    var go = el("button", "btn", "Выложить");
    c.appendChild(go);
    go.onclick = function () {
      if (!file.files[0]) return P.say(note, "Выбери файл сборки.", true);
      if (!/^\d+(\.\d+){1,3}$/.test(version.value.trim())) return P.say(note, "Версия вида 1.0.6.", true);
      go.disabled = true;
      P.say(note, "Загружаю…");
      P.upload("pc", file.files[0], function (p) { setBar(bar, p); }).then(function (d) {
        var manifest = { version: version.value.trim(), sha256: d.sha256, size: d.got, notes: notes.value.trim() };
        return P.sign(manifest, ["notes", "sha256", "size", "version"]).then(function (signature) {
          manifest.signature = signature;
          return ask("release_pc", { manifest: manifest });
        });
      }).then(function (d) {
        go.disabled = false;
        setBar(bar, 0);
        if (!d.ok) return P.say(note, d.error || "Не вышло.", true);
        P.say(note, "Готово: компьютеры с NEXUS найдут версию сами.");
        reload();
      }).catch(function (e) {
        go.disabled = false;
        setBar(bar, 0);
        P.say(note, e.message === "нет ключа" ? "Сначала добавь ключ обновлений." : (e.message || "Не вышло."), true);
      });
    };
    return c;
  }

  function phoneCard(kind, title, now, reload) {
    var c = P.card(title);
    c.appendChild(el("p", "note", now ? "Сейчас выложена " + now.version
                                        + (now.build ? " (сборка " + now.build + ")" : "") + " · " + human(now.size || 0)
                                      : "Пока ничего не выложено."));
    var file = P.picker(kind === "ios" ? ".ipa" : ".apk");
    var version = P.input(kind === "ios" ? "0.19.0" : "1.0.0");
    var build = kind === "ios" ? P.input("23") : null;
    var notes = P.area("Что нового");
    c.appendChild(P.row(kind === "ios" ? "Файл (.ipa)" : "Файл (.apk)", file));
    c.appendChild(P.row("Версия", version));
    if (build) c.appendChild(P.row("Номер сборки", build));
    c.appendChild(P.row("Что нового", notes));
    var bar = progress();
    setBar(bar, 0);
    c.appendChild(bar);
    var note = el("p", "note");
    c.appendChild(note);
    var go = el("button", "btn", "Выложить");
    c.appendChild(go);
    go.onclick = function () {
      if (!file.files[0]) return P.say(note, "Выбери файл.", true);
      if (!/^\d+(\.\d+){1,3}$/.test(version.value.trim())) return P.say(note, "Версия вида 1.0.0.", true);
      if (build && !/^\d+$/.test(build.value.trim())) return P.say(note, "Номер сборки — число.", true);
      go.disabled = true;
      P.say(note, "Загружаю…");
      P.upload(kind, file.files[0], function (p) { setBar(bar, p); }).then(function () {
        var body = { version: version.value.trim(), notes: notes.value.trim() };
        if (build) body.build = build.value.trim();
        return ask("release_" + (kind === "ios" ? "ios" : "android"), body);
      }).then(function (d) {
        go.disabled = false;
        setBar(bar, 0);
        if (!d.ok) return P.say(note, d.error || "Не вышло.", true);
        P.say(note, kind === "ios" ? "Готово: телефоны предложат её сами."
                                   : "Готово: файл лежит на сервере, ссылку дай на странице «Скачать».");
        reload();
      }).catch(function (e) {
        go.disabled = false;
        setBar(bar, 0);
        P.say(note, e.message || "Не вышло.", true);
      });
    };
    return c;
  }

  window.nexusPanelPages.updates = function (body) {
    ask("releases").then(function (d) {
      clear(body);
      var reload = function () { window.nexusPanelPages.updates(body); };
      var now = d.releases || {};
      body.appendChild(P.keyCard());
      body.appendChild(pcCard(now.pc, reload));
      body.appendChild(phoneCard("ios", "NEXUS для iPhone", now.ios, reload));
      body.appendChild(phoneCard("android", "NEXUS для Android", now.android, reload));
    }).catch(function () { fail(body, "Нет связи с сервером."); });
  };
})();
