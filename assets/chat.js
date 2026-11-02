// Chat with the creator of NEXUS, right on the site. Messages go to the NEXUS server (site.json → chat_api);
// the answer comes back here. The visitor is remembered in this browser only.
(function () {
  var api = window.NEXUS_CHAT || "";
  var box, list, input, after = 0, timer = null;

  function visitor() {
    try {
      var id = localStorage.getItem("nexus-chat-id");
      if (!id) {
        id = Math.random().toString(36).slice(2) + Date.now().toString(36);
        localStorage.setItem("nexus-chat-id", id);
      }
      return id;
    } catch (e) {
      return window.__nexusVisitor || (window.__nexusVisitor = Math.random().toString(36).slice(2));
    }
  }

  function line(text, mine) {
    var p = document.createElement("div");
    p.className = "chat-line" + (mine ? " mine" : "");
    p.textContent = text;
    list.appendChild(p);
    list.scrollTop = list.scrollHeight;
  }

  function poll() {
    if (!api) return;
    fetch(api + "/chat/poll?visitor=" + encodeURIComponent(visitor()) + "&after=" + after)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        (d.messages || []).forEach(function (m) {
          after = Math.max(after, m.id);
          line(m.text, m.from === "visitor");
        });
      })
      .catch(function () {});
  }

  function send() {
    var text = input.value.trim();
    if (!text) return;
    if (!api) {
      location.href = "mailto:" + (document.querySelector('a[href^="mailto:"]') || {}).textContent +
        "?body=" + encodeURIComponent(text);
      return;
    }
    input.value = "";
    fetch(api + "/chat/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitor: visitor(), text: text })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) { if (!d.ok) line(d.error || "Не отправилось.", false); poll(); })
      .catch(function () { line("Нет связи. Попробуй позже или напиши на почту.", false); });
  }

  function open() {
    if (!box) {
      box = document.createElement("div");
      box.className = "chat-box";
      box.innerHTML = '<div class="chat-head"><b>NEXUS</b><button class="chat-x" aria-label="Закрыть">×</button></div>' +
        '<div class="chat-list"></div>' +
        '<div class="chat-input"><input maxlength="1000" placeholder="Сообщение"><button class="btn small">→</button></div>';
      document.body.appendChild(box);
      list = box.querySelector(".chat-list");
      input = box.querySelector("input");
      box.querySelector(".chat-x").onclick = function () { box.classList.remove("on"); clearInterval(timer); };
      box.querySelector(".chat-input button").onclick = send;
      input.addEventListener("keydown", function (e) { if (e.key === "Enter") send(); });
      line("Привет! Напиши вопрос — отвечу здесь.", false);
    }
    box.classList.add("on");
    input.focus();
    poll();
    clearInterval(timer);
    timer = setInterval(poll, 5000);
  }

  document.addEventListener("click", function (e) {
    if (e.target.closest && e.target.closest("[data-chat]")) open();
  });
})();
