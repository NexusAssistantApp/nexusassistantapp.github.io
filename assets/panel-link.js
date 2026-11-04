// «Панель» в меню — только для создателя. Один раз входишь через Google (чат, отзывы или сама
// панель), браузер это запоминает, и дальше пункт появляется сам на каждой странице.
// Это только вид: сама панель всё равно спрашивает сервер, кто ты.
(function () {
  var api = window.NEXUS_CHAT || "", shown = false;

  function remember(yes) {
    try { yes ? localStorage.setItem("nexus-creator", "1") : localStorage.removeItem("nexus-creator"); } catch (e) {}
  }
  function remembered() {
    try { return localStorage.getItem("nexus-creator") === "1"; } catch (e) { return false; }
  }

  function show() {
    if (shown) return;
    shown = true;
    var nav = document.querySelector("header nav");
    if (nav && !nav.querySelector(".panel-link")) {
      var a = document.createElement("a");
      a.href = "panel.html";
      a.className = "panel-link";
      a.textContent = "Панель";
      if (location.pathname.indexOf("panel.html") >= 0) a.className += " on";
      nav.appendChild(a);
    }
  }

  function check(token) {
    return fetch(api + "/panel/login", { method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id_token: token }) }).then(function (r) { return r.json(); })
      .then(function (d) {
        remember(!!d.ok);
        if (d.ok) {
          try { sessionStorage.setItem("nexus-panel-key", d.key); } catch (e) {}
          show();
        }
        return d.ok;
      });
  }

  var onPanel = location.pathname.indexOf("panel.html") >= 0;
  if (remembered()) show();                       // этот браузер уже знает, что ты создатель
  if (!onPanel) {                                 // на самой панели вход делает panel.js
    document.addEventListener("nexus-google", function () {
      if (window.NEXUS_TOKEN) check(window.NEXUS_TOKEN).catch(function () {});
    });
  }
  window.nexusPanelCheck = check;
})();
