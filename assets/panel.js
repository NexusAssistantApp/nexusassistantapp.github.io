// Админ-панель NEXUS на сайте: вход почтой создателя через Google, затем обновления, модификации,
// цены, чат, форум, отзывы, аккаунты. Файлы уходят кусками на /panel/upload, а манифест обновления
// и карточку модификации подписывает САМ браузер — секретный ключ создателя остаётся здесь.
(function () {
  var api = window.NEXUS_CHAT || "", root = document.getElementById("panel");
  if (!root) return;
  var key = "", tab = "updates";
  try { key = sessionStorage.getItem("nexus-panel-key") || ""; } catch (e) {}

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }
  function clear(n) { while (n.firstChild) n.removeChild(n.firstChild); return n; }
  function post(path, body) {
    return fetch(api + path, { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body) }).then(function (r) { return r.json(); });
  }
  function remember(k) {
    key = k;
    try { k ? sessionStorage.setItem("nexus-panel-key", k) : sessionStorage.removeItem("nexus-panel-key"); } catch (e) {}
  }
  function ask(what, extra) {
    return post("/panel/do", Object.assign({ key: key, what: what }, extra || {})).then(function (d) {
      if (d && d.signed_in === false) { remember(""); signin(); throw new Error("нужен вход"); }
      return d;
    });
  }
  function fail(box, text) { clear(box).appendChild(el("div", "empty", text)); }
  function human(bytes) {
    return bytes > 1048576 ? (bytes / 1048576).toFixed(1) + " МБ" : Math.round(bytes / 1024) + " КБ";
  }
  function when(ts) {
    return ts ? new Date(ts * 1000).toLocaleString("ru-RU", { dateStyle: "short", timeStyle: "short" }) : "";
  }
  window.nexusPanel = { el: el, clear: clear, post: post, ask: ask, fail: fail, human: human, when: when,
                        api: api, root: root };

  // ------------------------------------------------------------------ вход
  function signin() {
    clear(root);
    var card = el("div", "card");
    card.appendChild(el("h3", null, "Вход в панель"));
    card.appendChild(el("p", null, "Войди почтой, которая в NEXUS записана как Создатель."));
    var holder = el("div", "gbtn");
    card.appendChild(holder);
    var note = el("p", "note");
    card.appendChild(note);
    root.appendChild(card);
    if (!window.NEXUS_GOOGLE) { note.textContent = "Вход через Google ещё не настроен."; return; }
    document.addEventListener("nexus-google", onGoogle);
    loadGoogle(holder, note);
  }
  function loadGoogle(holder, note) {
    function draw() {
      window.nexusGoogleInit();
      window.google.accounts.id.renderButton(holder, { theme: "filled_black", size: "large", locale: "ru" });
    }
    if (window.google && window.google.accounts) return draw();
    var script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.onload = draw;
    script.onerror = function () { note.textContent = "Google не загрузился."; };
    document.head.appendChild(script);
  }
  function onGoogle() {
    post("/panel/login", { id_token: window.NEXUS_TOKEN }).then(function (d) {
      if (!d.ok) { fail(root, d.error || "Не вышло войти."); return setTimeout(signin, 2500); }
      remember(d.key);
      try { localStorage.setItem("nexus-creator", "1"); } catch (e) {}   // «Панель» в меню и дальше
      shell(d.name);
    }).catch(function () { fail(root, "Нет связи с сервером."); });
  }

  // ------------------------------------------------------------------ каркас
  var TABS = [["updates", "Версии"], ["mods", "Модификации"], ["prices", "Цены"], ["chats", "Чат"],
              ["forum", "Форум"], ["reviews", "Отзывы"], ["users", "Аккаунты"]];

  function shell(name) {
    clear(root);
    var head = el("div", "panel-head");
    head.appendChild(el("div", "panel-who", name || "Создатель"));
    var out = el("button", "btn ghost small", "Выйти");
    out.onclick = function () { remember(""); signin(); };
    head.appendChild(out);
    root.appendChild(head);
    var bar = el("div", "panel-tabs");
    root.appendChild(bar);
    var body = el("div", "panel-body");
    root.appendChild(body);
    TABS.forEach(function (t) {
      var b = el("button", "panel-tab" + (t[0] === tab ? " on" : ""), t[1]);
      b.onclick = function () {
        tab = t[0];
        Array.prototype.forEach.call(bar.children, function (c) { c.className = "panel-tab"; });
        b.className = "panel-tab on";
        draw(body);
      };
      bar.appendChild(b);
    });
    draw(body);
  }

  function draw(body) {
    clear(body).appendChild(el("div", "empty", "Загружаю…"));
    var page = window.nexusPanelPages[tab];
    if (page) page(body);
  }

  window.nexusPanelPages = {};
  window.nexusPanelStart = function () { key ? shell("Создатель") : signin(); };

  // ------------------------------------------------------------------ подпись (ключ не уходит с этого браузера)
  var signKey = null;
  function pemBytes(pem) {
    var body = String(pem || "").replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    var raw = atob(body), out = new Uint8Array(raw.length);
    for (var i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }
  function loadKey(pem) {
    return crypto.subtle.importKey("pkcs8", pemBytes(pem), { name: "Ed25519" }, false, ["sign"])
      .then(function (k) {
        signKey = k;
        try { localStorage.setItem("nexus-panel-pem", pem); } catch (e) {}
        return k;
      });
  }
  function haveKey() {
    if (signKey) return Promise.resolve(signKey);
    var pem = "";
    try { pem = localStorage.getItem("nexus-panel-pem") || ""; } catch (e) {}
    return pem ? loadKey(pem) : Promise.reject(new Error("нет ключа"));
  }
  function forgetKey() {
    signKey = null;
    try { localStorage.removeItem("nexus-panel-pem"); } catch (e) {}
  }
  function sortedJson(obj, fields) {
    // ровно то, что подписывает make_update.py: ключи по алфавиту, без пробелов
    var parts = fields.slice().sort().map(function (f) { return JSON.stringify(f) + ":" + JSON.stringify(obj[f]); });
    return "{" + parts.join(",") + "}";
  }
  function sign(obj, fields) {
    return haveKey().then(function (k) {
      return crypto.subtle.sign("Ed25519", k, new TextEncoder().encode(sortedJson(obj, fields)));
    }).then(function (sig) {
      var bytes = new Uint8Array(sig), s = "";
      for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
      return btoa(s);
    });
  }
  window.nexusPanel.sign = sign;
  window.nexusPanel.loadKey = loadKey;
  window.nexusPanel.haveKey = haveKey;
  window.nexusPanel.forgetKey = forgetKey;

  // ------------------------------------------------------------------ файл кусками
  var PIECE = 4 * 1024 * 1024;
  function upload(kind, file, onProgress) {
    var total = Math.max(1, Math.ceil(file.size / PIECE));
    function piece(index) {
      if (index >= total) return Promise.reject(new Error("лишний кусок"));
      return file.slice(index * PIECE, (index + 1) * PIECE).arrayBuffer().then(function (buf) {
        var bytes = new Uint8Array(buf), s = "";
        for (var i = 0; i < bytes.length; i++) s += String.fromCharCode(bytes[i]);
        return post("/panel/upload", { key: key, kind: kind, index: index, total: total, data: btoa(s) });
      }).then(function (d) {
        if (!d.ok) throw new Error(d.error || "Не загрузилось.");
        if (onProgress) onProgress(Math.round(((index + 1) / total) * 100));
        return d.done ? d : piece(index + 1);
      });
    }
    return piece(0);
  }
  window.nexusPanel.upload = upload;

  // старт после всех panel-*.js: они дописывают свои страницы в window.nexusPanelPages
  setTimeout(function () { window.nexusPanelStart(); }, 0);
})();
