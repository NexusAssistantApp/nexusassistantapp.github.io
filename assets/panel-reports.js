// Панель → «Жалобы»: жалобы на сообщения в мессенджере NEXUS.
(function () {
  var P = window.nexusPanel;
  if (!P) return;
  var el = P.el, clear = P.clear, ask = P.ask, fail = P.fail, when = P.when;

  function count(reports) {                         // «Жалобы · 2» на вкладке
    var n = reports.filter(function (r) { return r.state !== "done"; }).length;
    Array.prototype.forEach.call(document.querySelectorAll(".panel-tab"), function (b) {
      if (b.dataset.tab === "reports") b.textContent = n ? "Жалобы · " + n : "Жалобы";
    });
    return n;
  }
  window.nexusPanelReportsCount = function () {
    ask("messenger_reports").then(function (d) { if (d && d.reports) count(d.reports); }).catch(function () {});
  };

  function person(name, email) { return (name || "—") + (email ? " (" + email + ")" : ""); }

  window.nexusPanelPages.reports = function (body) {
    function draw(d) {
      clear(body);
      if (!d || !d.reports) return fail(body, (d && d.error) || "Не вышло.");
      var n = count(d.reports);
      var c = P.card(n ? "Новых жалоб: " + n : "Новых жалоб нет");
      var note = el("p", "note");
      if (!d.reports.length) c.appendChild(el("p", "note", "Жалоб пока нет."));
      d.reports.forEach(function (r) {
        var box = el("div", "panel-line report" + (r.state === "done" ? " done" : ""));
        var info = el("div", "report-info");
        info.appendChild(el("div", "who", when(r.ts) + (r.chat_title ? " · " + r.chat_title : "") +
                                          (r.state === "done" ? " · разобрано" : "")));
        info.appendChild(el("div", null, "Пожаловался: " + person(r.from_name, r.from_email)));
        info.appendChild(el("div", null, "На кого: " + person(r.user_name, r.user_email)));
        info.appendChild(el("blockquote", "report-text", r.text || ""));
        if (r.why) info.appendChild(el("div", "note", "Причина: " + r.why));
        box.appendChild(info);
        var btns = el("div", "report-btns");
        function act(label, action, cls) {
          var b = el("button", "btn small" + (cls ? " " + cls : ""), label);
          b.onclick = function () {
            if (action === "delete" && !confirm("Удалить это сообщение у всех?")) return;
            if (action === "ban" && !confirm("Запретить писать " + (r.user_name || "этому человеку") + "?")) return;
            b.disabled = true;
            ask("messenger_report", { id: r.id, action: action }).then(function (x) {
              if (x && x.reports) draw(x); else { b.disabled = false; P.say(note, (x && x.error) || "Не вышло.", true); }
            }).catch(function () { b.disabled = false; P.say(note, "Нет связи.", true); });
          };
          btns.appendChild(b);
        }
        if (r.state === "done") act("Вернуть", "reopen", "ghost");
        else act("Разобрано", "close");
        if (r.text !== "(удалено)") act("Удалить сообщение", "delete", "ghost");
        act("Запретить писать", "ban", "ghost");
        act("Разрешить", "unban", "ghost");
        box.appendChild(btns);
        c.appendChild(box);
      });
      c.appendChild(note);
      body.appendChild(c);
    }
    ask("messenger_reports").then(draw).catch(function () { fail(body, "Нет связи с сервером."); });
  };
})();
