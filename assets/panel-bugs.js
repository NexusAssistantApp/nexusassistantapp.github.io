// Панель → «Ошибки»: отчёты кнопки «Ошибка» под ответами NEXUS (вопрос, ответ, вложения).
(function () {
  var P = window.nexusPanel;
  if (!P) return;
  var el = P.el, clear = P.clear, ask = P.ask, fail = P.fail, when = P.when;

  function count(reports) {                          // «Ошибки · 3» на вкладке
    var n = reports.filter(function (r) { return r.state !== "done"; }).length;
    Array.prototype.forEach.call(document.querySelectorAll(".panel-tab"), function (b) {
      if (b.dataset.tab === "bugs") b.textContent = n ? "Ошибки · " + n : "Ошибки";
    });
    return n;
  }
  window.nexusPanelBugsCount = function () {
    ask("bug_reports").then(function (d) { if (d && d.reports) count(d.reports); }).catch(function () {});
  };

  function fileView(r, f, holder, note) {
    var b = el("button", "btn ghost small", f.name + (f.size ? " · " + P.human(f.size) : ""));
    b.onclick = function () {
      b.disabled = true;
      ask("bug_file", { id: r.id, name: f.name }).then(function (d) {
        b.disabled = false;
        if (!d.ok) return P.say(note, d.error || "Не вышло.", true);
        var url = "data:" + (d.mime || "application/octet-stream") + ";base64," + d.data;
        if (String(d.mime).indexOf("image/") === 0) {
          var img = el("img", "bug-img");
          img.src = url;
          img.alt = d.name;
          holder.appendChild(img);
          b.hidden = true;
        } else {
          var a = el("a");
          a.href = url;
          a.download = d.name || f.name;
          document.body.appendChild(a);
          a.click();
          a.remove();
        }
      }).catch(function () { b.disabled = false; P.say(note, "Нет связи.", true); });
    };
    return b;
  }

  window.nexusPanelPages.bugs = function (body) {
    function draw(d) {
      clear(body);
      if (!d || !d.ok || !d.reports) return fail(body, (d && d.error) || "Не вышло.");
      var n = count(d.reports);
      var c = P.card(n ? "Новых ошибок: " + n : "Новых ошибок нет");
      var note = el("p", "note");
      if (!d.reports.length) c.appendChild(el("p", "note", "Отчётов пока нет."));
      d.reports.forEach(function (r) {
        var box = el("div", "panel-line report" + (r.state === "done" ? " done" : ""));
        var info = el("div", "report-info");
        info.appendChild(el("div", "who", [when(r.ts), r.email, r.version && "NEXUS " + r.version, r.model,
                                           r.state === "done" && "разобрано"].filter(Boolean).join(" · ")));
        info.appendChild(el("div", null, "Вопрос:"));
        var q = el("blockquote", "report-text", r.question || "");
        info.appendChild(q);
        info.appendChild(el("div", null, "Ответ NEXUS:"));
        var a = el("blockquote", "report-text", r.answer || "");
        info.appendChild(a);
        var more = el("button", "btn ghost small", "Полностью");
        more.onclick = function () {
          more.disabled = true;
          ask("bug_open", { id: r.id }).then(function (x) {
            if (!x.ok) { more.disabled = false; return P.say(note, x.error || "Не вышло.", true); }
            q.textContent = x.report.question || "";
            a.textContent = x.report.answer || "";
            more.hidden = true;
          }).catch(function () { more.disabled = false; P.say(note, "Нет связи.", true); });
        };
        info.appendChild(more);
        if ((r.files || []).length) {
          var files = el("div", "report-btns"), shown = el("div");
          r.files.forEach(function (f) { files.appendChild(fileView(r, f, shown, note)); });
          info.appendChild(files);
          info.appendChild(shown);
        }
        box.appendChild(info);
        var btns = el("div", "report-btns");
        function act(label, action, cls) {
          var b = el("button", "btn small" + (cls ? " " + cls : ""), label);
          b.onclick = function () {
            if (action === "delete" && !confirm("Удалить этот отчёт?")) return;
            b.disabled = true;
            ask("bug_report", { id: r.id, action: action }).then(function (x) {
              if (x && x.ok) draw(x); else { b.disabled = false; P.say(note, (x && x.error) || "Не вышло.", true); }
            }).catch(function () { b.disabled = false; P.say(note, "Нет связи.", true); });
          };
          btns.appendChild(b);
        }
        if (r.state === "done") act("Вернуть", "reopen", "ghost");
        else act("Разобрано", "close");
        act("Удалить", "delete", "ghost");
        box.appendChild(btns);
        c.appendChild(box);
      });
      c.appendChild(note);
      body.appendChild(c);
    }
    ask("bug_reports").then(draw).catch(function () { fail(body, "Нет связи с сервером."); });
  };
})();
