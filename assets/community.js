// The forum (forum.html) and the reviews (index.html), talking to the NEXUS server (site.json → chat_api).
(function () {
  var api = window.NEXUS_CHAT || "";
  if (!api) return;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text != null) e.textContent = text;
    return e;
  }
  function when(ts) {
    var d = new Date(ts * 1000);
    return d.toLocaleDateString("ru-RU") + " " + d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  function get(path) { return fetch(api + path).then(function (r) { return r.json(); }); }
  function post(path, body) {
    return fetch(api + path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json(); });
  }
  function rememberName(input) {
    try { input.value = localStorage.getItem("nexus-name") || ""; } catch (e) {}
    input.addEventListener("change", function () { try { localStorage.setItem("nexus-name", input.value); } catch (e) {} });
  }

  // ------------------------------------------------------------ reviews
  var reviews = document.getElementById("reviews-list");
  if (reviews) {
    get("/reviews").then(function (d) {
      reviews.innerHTML = "";
      if (!(d.reviews || []).length) { reviews.appendChild(el("div", "empty", "Пока нет отзывов.")); return; }
      d.reviews.forEach(function (r) {
        var c = el("div", "card review");
        c.appendChild(el("div", "stars", "★★★★★".slice(0, r.stars) + "☆☆☆☆☆".slice(0, 5 - r.stars)));
        c.appendChild(el("p", "", r.text));
        c.appendChild(el("div", "who", r.name));
        reviews.appendChild(c);
      });
    }).catch(function () {});
    var form = document.getElementById("review-form");
    var signin = document.getElementById("review-signin");
    var token = "";
    if (form && signin) {
      var google = window.NEXUS_GOOGLE || "";
      if (!google) {
        signin.appendChild(el("div", "who", "Оставить отзыв можно будет скоро."));
      } else {
        signin.appendChild(el("div", "who", "Чтобы оставить отзыв, войди через Google."));
        var holder = el("div", "gbutton");
        signin.appendChild(holder);
        var script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.onload = function () {
          window.nexusGoogleInit();
          document.addEventListener("nexus-google", function () {
            token = window.NEXUS_TOKEN;
            var name = "";
            try {
              var part = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
              name = JSON.parse(decodeURIComponent(escape(atob(part)))).given_name || "";
            } catch (e) {}
            document.getElementById("review-who").textContent = "Отзыв от: " + (name || "тебя");
            signin.hidden = true;
            form.hidden = false;
          });
          window.google.accounts.id.renderButton(holder, { theme: "filled_black", size: "large", text: "signin_with", locale: "ru" });
          document.dispatchEvent(new Event("nexus-google-ready"));
        };
        document.head.appendChild(script);
      }
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        post("/reviews/new", { id_token: token, stars: form.stars.value, text: form.text.value }).then(function (d) {
          form.querySelector(".form-note").textContent = d.ok ? "Спасибо! Отзыв появится после проверки." : (d.error || "Не отправилось.");
          if (d.ok) form.text.value = "";
        });
      });
    }
  }

  // ------------------------------------------------------------ forum
  var forum = document.getElementById("forum");
  if (!forum) return;
  var sections = { questions: "Вопросы", ideas: "Идеи", mods: "Модификации" };
  var current = "";

  function list() {
    var id = parseInt((location.hash.match(/^#t(\d+)$/) || [])[1] || "0", 10);
    if (id) return open(id);
    get("/forum/topics" + (current ? "?section=" + current : "")).then(function (d) {
      forum.innerHTML = "";
      var tabs = el("div", "tabs");
      [["", "Все"]].concat(Object.keys(sections).map(function (k) { return [k, sections[k]]; })).forEach(function (t) {
        var b = el("button", "tab" + (current === t[0] ? " on" : ""), t[1]);
        b.onclick = function () { current = t[0]; list(); };
        tabs.appendChild(b);
      });
      var add = el("button", "btn small", "Новая тема");
      add.onclick = newTopic;
      tabs.appendChild(add);
      forum.appendChild(tabs);
      if (!(d.topics || []).length) { forum.appendChild(el("div", "empty", "Тем пока нет.")); return; }
      d.topics.forEach(function (t) {
        var row = el("a", "topic");
        row.href = "#t" + t.id;
        row.appendChild(el("b", "", t.title));
        row.appendChild(el("span", "", sections[t.section] + " · " + t.name + " · ответов: " + t.replies + " · " + when(t.updated)));
        forum.appendChild(row);
      });
    }).catch(function () { forum.innerHTML = ""; forum.appendChild(el("div", "empty", "Форум сейчас недоступен.")); });
  }

  function open(id) {
    get("/forum/topic?id=" + id).then(function (d) {
      forum.innerHTML = "";
      var back = el("a", "back", "← Все темы");
      back.href = "#";
      forum.appendChild(back);
      if (!d.topic) { forum.appendChild(el("div", "empty", "Тема удалена.")); return; }
      forum.appendChild(el("h3", "topic-title", d.topic.title));
      d.posts.forEach(function (p) {
        var c = el("div", "card post" + (p.creator ? " creator" : ""));
        c.appendChild(el("div", "who", p.name + " · " + when(p.ts)));
        c.appendChild(el("p", "", p.text));
        forum.appendChild(c);
      });
      forum.appendChild(form("Ответить", false, function (f) {
        return post("/forum/reply", { id: id, name: f.name.value, text: f.text.value });
      }));
    });
  }

  function newTopic() {
    forum.innerHTML = "";
    var back = el("a", "back", "← Все темы");
    back.href = "#";
    back.onclick = function (e) { e.preventDefault(); list(); };
    forum.appendChild(back);
    forum.appendChild(form("Создать тему", true, function (f) {
      return post("/forum/new", { section: f.section.value, name: f.name.value, title: f.title.value, text: f.text.value })
        .then(function (d) { if (d.ok) location.hash = "#t" + d.id; return d; });
    }));
  }

  function form(button, withTitle, send) {
    var f = el("form", "card form");
    var name = el("input"); name.name = "name"; name.placeholder = "Имя"; name.maxLength = 40;
    rememberName(name);
    f.appendChild(name);
    if (withTitle) {
      var s = el("select"); s.name = "section";
      Object.keys(sections).forEach(function (k) { var o = el("option", "", sections[k]); o.value = k; s.appendChild(o); });
      f.appendChild(s);
      var t = el("input"); t.name = "title"; t.placeholder = "Тема"; t.maxLength = 120; t.required = true;
      f.appendChild(t);
    }
    var text = el("textarea"); text.name = "text"; text.placeholder = "Сообщение"; text.maxLength = 3000; text.required = true;
    f.appendChild(text);
    var b = el("button", "btn", button); b.type = "submit";
    f.appendChild(b);
    var note = el("div", "form-note");
    f.appendChild(note);
    f.addEventListener("submit", function (e) {
      e.preventDefault();
      send(f).then(function (d) {
        if (!d.ok) { note.textContent = d.error || "Не отправилось."; return; }
        if (!withTitle) list();
      });
    });
    return f;
  }

  window.addEventListener("hashchange", list);
  list();
})();
