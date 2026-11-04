// Страницы админ-панели NEXUS (каркас и подпись — в panel.js).
(function () {
  var P = window.nexusPanel;
  if (!P) return;
  var el = P.el, clear = P.clear, ask = P.ask, fail = P.fail, human = P.human, when = P.when;

  function row(label, node) {
    var r = el("div", "field");
    r.appendChild(el("label", null, label));
    r.appendChild(node);
    return r;
  }
  function input(placeholder, value) {
    var i = el("input");
    i.type = "text";
    i.placeholder = placeholder || "";
    if (value != null) i.value = value;
    return i;
  }
  function area(placeholder, value) {
    var t = el("textarea");
    t.placeholder = placeholder || "";
    t.rows = 3;
    if (value != null) t.value = value;
    return t;
  }
  function picker(accept) {
    var f = el("input");
    f.type = "file";
    if (accept) f.accept = accept;
    return f;
  }
  function card(title) {
    var c = el("div", "card panel-card");
    if (title) c.appendChild(el("h3", null, title));
    return c;
  }
  function say(node, text, bad) {
    node.className = "note" + (bad ? " bad" : " good");
    node.textContent = text;
  }

  // ------------------------------------------------------------------ ключ обновлений
  function keyCard(onReady) {
    var c = card("Ключ обновлений");
    var note = el("p", "note");
    c.appendChild(note);
    P.haveKey().then(function () {
      say(note, "Ключ на месте — подпись делает этот браузер.");
      var out = el("button", "btn ghost small", "Убрать ключ из браузера");
      out.onclick = function () { P.forgetKey(); window.nexusPanelStart(); };
      c.appendChild(out);
      if (onReady) onReady(true);
    }).catch(function () {
      c.appendChild(el("p", null, "Чтобы выкладывать версии и модификации, добавь файл ключа "
        + "update_key.pem с компьютера. Он останется только в этом браузере."));
      var file = picker(".pem");
      c.appendChild(row("Файл ключа", file));
      file.onchange = function () {
        if (!file.files[0]) return;
        file.files[0].text().then(function (pem) { return P.loadKey(pem); })
          .then(function () { window.nexusPanelStart(); })
          .catch(function () { say(note, "Это не тот файл — нужен update_key.pem.", true); });
      };
      if (onReady) onReady(false);
    });
    return c;
  }
  P.keyCard = keyCard;
  P.row = row; P.input = input; P.area = area; P.picker = picker; P.card = card; P.say = say;
})();
