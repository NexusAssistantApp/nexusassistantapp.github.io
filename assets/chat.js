// Support chat on the site: sign in with Google, then write and send photos. Messages go to the NEXUS server
// (site.json → chat_api) and on to the creator's Telegram; his answers come back here.
// One «Войти через Google» for the whole page: the chat, the reviews and the shop all hear «nexus-google».
window.nexusGoogleInit = function () {
  if (window.__nexusGoogleReady || !(window.google && window.google.accounts) || !window.NEXUS_GOOGLE) return;
  window.__nexusGoogleReady = true;
  window.google.accounts.id.initialize({ client_id: window.NEXUS_GOOGLE, callback: function (answer) {
    window.NEXUS_TOKEN = answer.credential;
    document.dispatchEvent(new Event("nexus-google"));
  } });
};

(function () {
  var api = window.NEXUS_CHAT || "", google = window.NEXUS_GOOGLE || "", waiting = false;
  var box, list, input, file, after = 0, timer = null, key = "";

  try { key = localStorage.getItem("nexus-chat-key") || ""; } catch (e) {}
  function remember(k) { key = k; try { k ? localStorage.setItem("nexus-chat-key", k) : localStorage.removeItem("nexus-chat-key"); } catch (e) {} }

  function line(m) {
    var p = document.createElement("div");
    p.className = "chat-line" + (m.from === "visitor" ? " mine" : "");
    if (m.photo) {
      var img = document.createElement("img");
      img.src = api + "/chat/file/" + m.photo;
      img.alt = "фото";
      img.onclick = function () { window.open(img.src, "_blank"); };
      p.appendChild(img);
    }
    if (m.text) p.appendChild(document.createTextNode(m.text));
    list.appendChild(p);
    list.scrollTop = list.scrollHeight;
  }
  function note(text) { line({ from: "nexus", text: text }); }

  function poll() {
    if (!api || !key) return;
    fetch(api + "/chat/poll?key=" + encodeURIComponent(key) + "&after=" + after)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.signed_in === false) { remember(""); return showSignin(); }
        (d.messages || []).forEach(function (m) { after = Math.max(after, m.id); line(m); });
      })
      .catch(function () {});
  }

  function post(body) {
    return fetch(api + "/chat/send", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(Object.assign({ key: key }, body)) }).then(function (r) { return r.json(); });
  }

  function send() {
    var text = input.value.trim();
    if (!text) return;
    input.value = "";
    post({ text: text }).then(function (d) {
      if (d.signed_in === false) { remember(""); return showSignin(); }
      if (!d.ok) note(d.error || "Не отправилось.");
      poll();
    }).catch(function () { note("Нет связи. Попробуй позже или напиши на почту."); });
  }

  // A photo: shrunk in the browser (the long side ≤ 1600 px) so it goes quickly.
  function sendPhoto(f) {
    if (!f || !/^image\//.test(f.type)) return note("Можно прислать фото.");
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var scale = Math.min(1, 1600 / Math.max(img.width, img.height));
        var c = document.createElement("canvas");
        c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        note("Отправляю фото…");
        post({ photo: c.toDataURL("image/jpeg", 0.85), text: input.value.trim() }).then(function (d) {
          input.value = "";
          if (!d.ok) note(d.error || "Фото не отправилось.");
          poll();
        }).catch(function () { note("Нет связи."); });
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(f);
  }

  function showSignin() {
    var area = box.querySelector(".chat-signin");
    box.querySelector(".chat-input").hidden = true;
    area.hidden = false;
    if (!google) { area.textContent = "Поддержка скоро откроется. Пока — на почту."; return; }
    waiting = true;
    function render() {
      window.nexusGoogleInit();
      area.querySelector(".gbutton") || area.appendChild(Object.assign(document.createElement("div"), { className: "gbutton" }));
      window.google.accounts.id.renderButton(area.querySelector(".gbutton"),
        { theme: "filled_black", size: "large", text: "signin_with", locale: "ru" });
    }
    if (window.google && window.google.accounts) return render();
    var s = document.createElement("script");
    s.src = "https://accounts.google.com/gsi/client"; s.async = true; s.onload = render;
    document.head.appendChild(s);
  }

  function open() {
    if (!box) {
      box = document.createElement("div");
      box.className = "chat-box";
      box.innerHTML = '<div class="chat-head"><b>Поддержка NEXUS</b><button class="chat-x" aria-label="Закрыть">×</button></div>' +
        '<div class="chat-list"></div>' +
        '<div class="chat-signin" hidden><div class="who">Войди через Google, чтобы написать в поддержку.</div></div>' +
        '<div class="chat-input"><button class="chat-clip" aria-label="Фото" title="Фото">📎</button>' +
        '<input class="chat-text" maxlength="1000" placeholder="Сообщение"><input type="file" accept="image/*" hidden>' +
        '<button class="btn small chat-send">→</button></div>';
      document.body.appendChild(box);
      list = box.querySelector(".chat-list");
      input = box.querySelector(".chat-text");
      file = box.querySelector("input[type=file]");
      box.querySelector(".chat-x").onclick = function () { box.classList.remove("on"); clearInterval(timer); };
      box.querySelector(".chat-send").onclick = send;
      box.querySelector(".chat-clip").onclick = function () { file.click(); };
      file.onchange = function () { sendPhoto(file.files[0]); file.value = ""; };
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
      list.addEventListener("dragover", function (e) { e.preventDefault(); });
      list.addEventListener("drop", function (e) { e.preventDefault(); sendPhoto(e.dataTransfer.files[0]); });
      line({ from: "nexus", text: "Привет! Напиши вопрос — отвечу здесь." });
    }
    box.classList.add("on");
    if (!key) showSignin(); else { input.focus(); poll(); }
    clearInterval(timer);
    timer = setInterval(poll, 5000);
  }

  // Signed in with Google anywhere on the page: the chat logs in too, if it was asking.
  document.addEventListener("nexus-google", function () {
    if (!waiting || !box) return;
    waiting = false;
    var area = box.querySelector(".chat-signin");
    fetch(api + "/chat/login", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: window.NEXUS_TOKEN }) })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d.ok) return note(d.error || "Не получилось войти.");
        remember(d.key);
        area.hidden = true;
        box.querySelector(".chat-input").hidden = false;
        note("Привет, " + d.name + "! Напиши вопрос или пришли фото.");
        poll();
      });
  });

  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-chat]")) open();
  });
})();
