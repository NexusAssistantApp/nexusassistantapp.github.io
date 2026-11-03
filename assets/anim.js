// The site's life: NEXUS's eyes look around (and after the mouse), blink, get happy; confetti; blocks fade in.
(function () {
  var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ------------------------------------------------------------ the eyes
  var face = document.getElementById("face"), eyes = document.getElementById("eyes");
  if (face && eyes && !calm) {
    var lastMouse = 0;
    function look(x, y) { eyes.style.transform = "translate(" + x.toFixed(1) + "px," + y.toFixed(1) + "px)"; }
    document.addEventListener("mousemove", function (e) {
      var r = face.getBoundingClientRect();
      var dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      var dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      lastMouse = Date.now();
      look(Math.max(-1, Math.min(1, dx * 2)) * r.width * 0.12, Math.max(-1, Math.min(1, dy * 2)) * r.height * 0.08);
    });
    setInterval(function () {                                 // nobody moves the mouse: it looks around itself
      if (Date.now() - lastMouse < 2500) return;
      var r = face.getBoundingClientRect();
      look((Math.random() * 2 - 1) * r.width * 0.12, (Math.random() * 2 - 1) * r.height * 0.07);
    }, 1400);
    (function blink() {
      face.classList.add("blink");
      setTimeout(function () { face.classList.remove("blink"); }, 140);
      setTimeout(blink, 2200 + Math.random() * 3500);
    })();
    function happy(ms) {
      face.classList.add("happy");
      setTimeout(function () { face.classList.remove("happy"); }, ms);
    }
    setInterval(function () { if (Math.random() < 0.5) happy(1600); }, 7000);
    face.addEventListener("click", function () { happy(1800); burst(); });
    document.querySelectorAll(".btn").forEach(function (b) { b.addEventListener("mouseenter", function () { happy(900); }); });
  }

  // ------------------------------------------------------------ confetti
  var canvas = document.createElement("canvas"), ctx = canvas.getContext && canvas.getContext("2d"), bits = [];
  var colors = ["#1E88FF", "#5CB2FF", "#FF5FA2", "#FFD34D", "#4ADE80"];
  function piece(x, y, fast) {
    return { x: x, y: y, s: 4 + Math.random() * 6, c: colors[(Math.random() * colors.length) | 0],
             vy: fast ? -4 - Math.random() * 5 : 0.4 + Math.random() * 0.9, vx: fast ? (Math.random() * 2 - 1) * 5 : (Math.random() - 0.5) * 0.4,
             r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.1, fast: fast };
  }
  function burst() {
    if (!ctx || calm) return;
    var r = face.getBoundingClientRect();
    for (var i = 0; i < 60; i++) bits.push(piece(r.left + r.width / 2, r.top + r.height * 0.3, true));
  }
  window.nexusConfetti = burst;
  if (ctx && !calm) {
    canvas.id = "confetti";
    document.body.insertBefore(canvas, document.body.firstChild);
    function size() { canvas.width = innerWidth; canvas.height = innerHeight; }
    size();
    addEventListener("resize", size);
    for (var i = 0; i < 26; i++) bits.push(piece(Math.random() * innerWidth, Math.random() * innerHeight, false));
    (function frame() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      bits.forEach(function (b) {
        if (b.fast) { b.vy += 0.18; b.vx *= 0.98; }
        b.x += b.vx; b.y += b.vy; b.r += b.vr;
        ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(b.r);
        ctx.globalAlpha = b.fast ? 0.95 : 0.35;
        ctx.fillStyle = b.c; ctx.fillRect(-b.s / 2, -b.s / 4, b.s, b.s / 2);
        ctx.restore();
        if (!b.fast && b.y > canvas.height + 10) { b.y = -10; b.x = Math.random() * canvas.width; }
      });
      bits = bits.filter(function (b) { return !b.fast || b.y < canvas.height + 20; });
      requestAnimationFrame(frame);
    })();
    setTimeout(burst, 600);                                  // a little celebration when the page opens
  }

  // ------------------------------------------------------------ blocks fade in
  if ("IntersectionObserver" in window && !calm) {
    var seen = new IntersectionObserver(function (items) {
      items.forEach(function (it) { if (it.isIntersecting) { it.target.classList.add("in"); seen.unobserve(it.target); } });
    }, { threshold: 0.12 });
    document.querySelectorAll("section .card, section h2, .flow-step, .contact, .doc h2").forEach(function (el, i) {
      el.classList.add("reveal");
      el.style.transitionDelay = (i % 6) * 60 + "ms";
      seen.observe(el);
    });
  }
})();
