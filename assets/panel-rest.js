// Панель → «Цены», «Чат», «Форум», «Отзывы», «Аккаунты».
(function () {
  var P = window.nexusPanel;
  if (!P) return;
  var el = P.el, clear = P.clear, ask = P.ask, fail = P.fail, when = P.when;

  // ------------------------------------------------------------------ цены
  window.nexusPanelPages.prices = function (body) {
    ask("prices").then(function (d) {
      clear(body);
      if (!d.ok) return fail(body, d.error || "Не вышло.");
      var c = P.card("Подписка");
      c.appendChild(el("p", "note", d.ready ? "Оплата на сайте включена."
                                            : "Оплата на сайте выключена — покупатели получают коды."));
      var note = el("p", "note");
      (d.products || []).forEach(function (p) {
        if (p.id.indexOf("mod:") === 0) return;        // цена модификации — на своей странице
        var line = el("div", "panel-line");
        line.appendChild(el("b", null, p.name));
        var price = P.input("Цена", String(p.price));
        var old = P.input("Было (0 — без скидки)", String(p.old || 0));
        price.style.maxWidth = "120px";
        old.style.maxWidth = "160px";
        line.appendChild(price);
        line.appendChild(old);
        var save = el("button", "btn small", "Сохранить");
        save.onclick = function () {
          save.disabled = true;
          ask("set_price", { product: p.id, price: parseInt(price.value, 10) || 0,
                             old: parseInt(old.value, 10) || 0 }).then(function (r) {
            save.disabled = false;
            P.say(note, r.ok ? "Сохранено." : (r.error || "Не вышло."), !r.ok);
          }).catch(function () { save.disabled = false; P.say(note, "Нет связи.", true); });
        };
        line.appendChild(save);
        c.appendChild(line);
      });
      var sale = P.input("Надпись скидки", d.sale || "");
      var saleSave = el("button", "btn ghost small", "Сохранить надпись");
      saleSave.onclick = function () {
        var first = (d.products || [])[0];
        if (!first) return;
        ask("set_price", { product: first.id, price: first.price, old: first.old || 0, sale: sale.value })
          .then(function (r) { P.say(note, r.ok ? "Сохранено." : (r.error || "Не вышло."), !r.ok); });
      };
      c.appendChild(P.row("Скидка", sale));
      c.appendChild(saleSave);
      c.appendChild(note);
      body.appendChild(c);
      promos(body);
      orders(body);
    }).catch(function () { fail(body, "Нет связи с сервером."); });
  };

  function day(iso) {                                        // «2026-11-30» → «30.11.2026»
    var p = String(iso || "").split("-");
    return p.length === 3 ? p[2] + "." + p[1] + "." + p[0] : String(iso || "");
  }

  // ------------------------------------------------------------------ промокоды
  // Скидка в процентах на подписку и платные модификации; покупатель вводит код при оплате.
  function promos(body) {
    var c = P.card("Промокоды");
    var list = el("div");
    var note = el("p", "note");
    var draw = function (rows) {
      clear(list);
      if (!rows.length) list.appendChild(el("p", "note", "Промокодов пока нет."));
      rows.forEach(function (x) {
        var line = el("div", "panel-line");
        line.appendChild(el("b", null, x.code));
        line.appendChild(el("span", "price-tag", "−" + x.percent + "%"));
        line.appendChild(el("span", x.ended ? "note bad" : "note",
                            x.ended ? "истёк " + day(x.until) : (x.until ? "до " + day(x.until) : "без срока")));
        line.appendChild(el("span", "note", x.used ? "оплачено с ним: " + x.used : "ещё не использован"));
        var copy = el("button", "btn ghost small", "Скопировать");
        copy.onclick = function () {
          try { navigator.clipboard.writeText(x.code); P.say(note, "Скопировано: " + x.code); }
          catch (e) { P.say(note, x.code); }
        };
        var del = el("button", "btn ghost small", "Удалить");
        del.onclick = function () {
          if (!window.confirm("Удалить промокод " + x.code + "?")) return;
          ask("promo_delete", { code: x.code }).then(function (r) {
            if (!r.ok) return P.say(note, r.error || "Не вышло.", true);
            draw(r.promos || []);
          }).catch(function () { P.say(note, "Нет связи.", true); });
        };
        line.appendChild(copy);
        line.appendChild(del);
        list.appendChild(line);
      });
    };
    var add = el("div", "panel-line");
    var code = P.input("Код (пусто — придумаю сам)", "");
    var percent = P.input("Скидка, %", "10");
    var until = document.createElement("input");             // последний день, когда код работает
    until.type = "date";
    until.title = "До какого дня действует (пусто — без срока)";
    code.style.maxWidth = "240px";
    percent.style.maxWidth = "110px";
    until.style.maxWidth = "170px";
    var quick = el("div", "panel-line");
    quick.appendChild(el("span", "note", "Срок:"));
    [["Без срока", 0], ["Неделя", 7], ["Месяц", 30], ["3 месяца", 91]].forEach(function (q) {
      var b = el("button", "btn ghost small", q[0]);
      b.onclick = function () {
        if (!q[1]) { until.value = ""; return; }
        var d = new Date(Date.now() + q[1] * 86400000);
        until.value = d.getFullYear() + "-" + ("0" + (d.getMonth() + 1)).slice(-2) + "-" + ("0" + d.getDate()).slice(-2);
      };
      quick.appendChild(b);
    });
    var make = el("button", "btn small", "Создать");
    make.onclick = function () {
      make.disabled = true;
      ask("promo_add", { code: code.value.trim(), percent: parseInt(percent.value, 10) || 0,
                         until: until.value || "" }).then(function (r) {
        make.disabled = false;
        if (!r.ok) return P.say(note, r.error || "Не вышло.", true);
        code.value = "";
        P.say(note, "Готово.");
        draw(r.promos || []);
      }).catch(function () { make.disabled = false; P.say(note, "Нет связи.", true); });
    };
    add.appendChild(code);
    add.appendChild(percent);
    add.appendChild(until);
    add.appendChild(make);
    c.appendChild(add);
    c.appendChild(quick);
    c.appendChild(note);
    c.appendChild(list);
    body.appendChild(c);
    ask("promos").then(function (r) { draw((r && r.promos) || []); }).catch(function () {});
  }

  function orders(body) {
    ask("orders").then(function (o) {
      var h = P.card("Продажи");
      var rows = (o.orders || []).filter(function (x) { return x.status === "paid"; });
      if (!rows.length) h.appendChild(el("p", "note", "Покупок пока нет."));
      rows.slice(0, 50).forEach(function (x) {
        h.appendChild(el("div", "panel-line", x.name + " · " + x.price + " ₽ · " + x.email + " · " + when(x.made)));
      });
      body.appendChild(h);
    }).catch(function () {});
  }

  // ------------------------------------------------------------------ чат с сайта
  window.nexusPanelPages.chats = function (body) {
    ask("chats").then(function (d) {
      clear(body);
      var rows = d.chats || [];
      if (!rows.length) return fail(body, "Писем пока нет.");
      rows.forEach(function (chat) {
        var c = el("div", "card panel-card");
        var head = el("div", "mod-head");
        head.appendChild(el("b", null, chat.name));
        head.appendChild(el("span", "note", when(chat.updated) + (chat.unread ? " · новых: " + chat.unread : "")));
        c.appendChild(head);
        c.appendChild(el("p", "note", chat.last));
        var open = el("button", "btn ghost small", "Открыть");
        c.appendChild(open);
        var talk = el("div", "chat-thread");
        c.appendChild(talk);
        open.onclick = function () {
          ask("chat_open", { visitor: chat.visitor }).then(function (r) {
            show(talk, chat.visitor, r.messages || []);
          });
        };
        body.appendChild(c);
      });
    }).catch(function () { fail(body, "Нет связи с сервером."); });
  };

  function show(box, visitor, messages) {
    clear(box);
    messages.forEach(function (m) {
      var line = el("div", "chat-line" + (m.from === "nexus" ? " mine" : ""));
      if (m.photo) {
        var img = el("img");
        img.src = P.api + "/chat/file/" + m.photo;
        img.onclick = function () { window.open(img.src, "_blank"); };
        line.appendChild(img);
      }
      if (m.text) line.appendChild(document.createTextNode(m.text));
      box.appendChild(line);
    });
    var row = el("div", "panel-line");
    var text = P.input("Ответ");
    var send = el("button", "btn small", "Ответить");
    send.onclick = function () {
      if (!text.value.trim()) return;
      ask("chat_reply", { visitor: visitor, text: text.value.trim() }).then(function (r) {
        show(box, visitor, r.messages || []);
      });
    };
    text.onkeydown = function (e) { if (e.key === "Enter") send.onclick(); };
    row.appendChild(text);
    row.appendChild(send);
    box.appendChild(row);
  }

  // ------------------------------------------------------------------ форум
  window.nexusPanelPages.forum = function (body) {
    ask("forum_posts").then(function (d) {
      clear(body);
      var rows = d.posts || [];
      if (!rows.length) return fail(body, "На форуме пока тихо.");
      rows.forEach(function (p) {
        var c = el("div", "card panel-card");
        var head = el("div", "mod-head");
        head.appendChild(el("b", null, p.name));
        head.appendChild(el("span", "note", p.topic + " · " + when(p.ts)));
        c.appendChild(head);
        c.appendChild(el("p", null, p.text));
        var row = el("div", "panel-line");
        var answer = P.input("Ответить от NEXUS");
        var send = el("button", "btn small", "Ответить");
        var del = el("button", "btn ghost small", "Удалить");
        send.onclick = function () {
          if (!answer.value.trim()) return;
          ask("forum_reply", { id: p.topic_id, text: answer.value.trim() })
            .then(function () { window.nexusPanelPages.forum(body); });
        };
        del.onclick = function () {
          if (!window.confirm("Удалить это сообщение?")) return;
          ask("forum_delete", { id: p.id }).then(function () { window.nexusPanelPages.forum(body); });
        };
        row.appendChild(answer);
        row.appendChild(send);
        row.appendChild(del);
        c.appendChild(row);
        body.appendChild(c);
      });
    }).catch(function () { fail(body, "Нет связи с сервером."); });
  };

  // ------------------------------------------------------------------ отзывы
  window.nexusPanelPages.reviews = function (body) {
    ask("reviews").then(function (d) {
      clear(body);
      var rows = d.reviews || [];
      if (!rows.length) return fail(body, "Новых отзывов нет.");
      rows.forEach(function (r) {
        var c = el("div", "card panel-card");
        var head = el("div", "mod-head");
        head.appendChild(el("b", null, r.name));
        var stars = "";
        for (var i = 0; i < r.stars; i++) stars += "★";
        head.appendChild(el("span", "note", stars + " · " + when(r.ts)));
        c.appendChild(head);
        c.appendChild(el("p", null, r.text));
        var row = el("div", "panel-line");
        var ok = el("button", "btn small", "Показать на сайте");
        var no = el("button", "btn ghost small", "Удалить");
        ok.onclick = function () {
          ask("review_approve", { id: r.id }).then(function () { window.nexusPanelPages.reviews(body); });
        };
        no.onclick = function () {
          ask("review_delete", { id: r.id }).then(function () { window.nexusPanelPages.reviews(body); });
        };
        row.appendChild(ok);
        row.appendChild(no);
        c.appendChild(row);
        body.appendChild(c);
      });
    }).catch(function () { fail(body, "Нет связи с сервером."); });
  };

  // ------------------------------------------------------------------ аккаунты
  window.nexusPanelPages.users = function (body) {
    ask("users").then(function (d) {
      clear(body);
      var codes = P.card("Коды подписки");
      var row = el("div", "panel-line");
      var plan = el("select");
      [["1m", "1 месяц"], ["3m", "3 месяца"], ["1y", "1 год"]].forEach(function (p) {
        var o = el("option", null, p[1]);
        o.value = p[0];
        plan.appendChild(o);
      });
      var count = P.input("Сколько", "1");
      count.style.maxWidth = "100px";
      var make = el("button", "btn small", "Сделать");
      var out = el("pre", "codes");
      make.onclick = function () {
        ask("codes", { plan: plan.value, count: parseInt(count.value, 10) || 1 }).then(function (r) {
          out.textContent = (r.codes || []).join("\n");
        });
      };
      row.appendChild(plan);
      row.appendChild(count);
      row.appendChild(make);
      codes.appendChild(row);
      codes.appendChild(out);
      body.appendChild(codes);
      var list = P.card("Аккаунты");
      (d.users || []).slice(0, 100).forEach(function (u) {
        var line = el("div", "panel-line");
        line.appendChild(el("b", null, u.email));
        line.appendChild(el("span", "note", u.plan_name + (u.active ? "" : " · не активна")
          + " · устройств: " + u.devices + (u.banned ? " · заблокирован" : "")));
        var give = el("button", "btn ghost small", "+1 месяц");
        give.onclick = function () {
          ask("grant", { email: u.email, plan: "1m" }).then(function () { window.nexusPanelPages.users(body); });
        };
        line.appendChild(give);
        list.appendChild(line);
      });
      body.appendChild(list);
    }).catch(function () { fail(body, "Нет связи с сервером."); });
  };
})();
