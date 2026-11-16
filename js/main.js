/* Portfolio Anaïs Djomna — interactions
   - apparitions au scroll
   - chiffres animés
   - Reels : lecture auto muette quand visibles, bouton son, cadre réservé si la vidéo manque
   - barres de progression des graphiques
   - visionneuse photo */
(function () {
  "use strict";
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Barre de progression ---------- */
  var bar = document.querySelector(".progress");
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    if (bar) bar.style.transform = "scaleX(" + (max > 0 ? h.scrollTop / max : 0) + ")";
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- Chiffres animés ---------- */
  function fmt(n, dec) {
    return n.toLocaleString("fr-FR", { minimumFractionDigits: dec, maximumFractionDigits: dec }).replace(/ /g, " ");
  }
  function countUp(el) {
    var target = parseFloat(el.getAttribute("data-count"));
    var dec = parseInt(el.getAttribute("data-dec") || "0", 10);
    var pre = el.getAttribute("data-prefix") || "";
    var suf = el.getAttribute("data-suffix") || "";
    var finalTxt = pre + fmt(target, dec) + suf;
    if (reduce) { el.textContent = finalTxt; return; }
    var t0 = null, dur = 1200;
    // filet de sécurité : la valeur finale s'affiche même si l'onglet est ralenti
    setTimeout(function () { el.textContent = finalTxt; }, dur + 200);
    function step(t) {
      if (!t0) t0 = t;
      var p = Math.min((t - t0) / dur, 1);
      var e = 1 - Math.pow(1 - p, 3);
      el.textContent = p < 1 ? pre + fmt(target * e, dec) + suf : finalTxt;
      if (p < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  /* ---------- Observateur unique ---------- */
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var el = en.target;
      el.classList.add("is-in");
      el.querySelectorAll("[data-count]").forEach(countUp);
      if (el.hasAttribute("data-count")) countUp(el);
      el.querySelectorAll("[data-w]").forEach(function (b) { b.style.width = b.getAttribute("data-w"); });
      io.unobserve(el);
    });
  }, { threshold: 0.18 });
  document.querySelectorAll(".reveal, [data-count]:not(.reveal [data-count]), .js-bars").forEach(function (el) { io.observe(el); });

  /* ---------- Reels ---------- */
  var ICON_OFF = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="m23 9-6 6M17 9l6 6"/></svg>';
  var ICON_ON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M19 5a10 10 0 0 1 0 14"/></svg>';

  document.querySelectorAll(".phone[data-video]").forEach(function (ph) {
    var v = ph.querySelector("video");
    var btn = ph.querySelector(".sound");
    if (!v) return;
    v.muted = true; v.loop = true; v.playsInline = true;
    v.setAttribute("muted", ""); v.setAttribute("playsinline", "");
    function missing() { ph.classList.add("is-missing"); }
    v.addEventListener("error", missing, true);
    var src = v.querySelector("source");
    if (src) src.addEventListener("error", missing);
    if (btn) {
      btn.innerHTML = ICON_OFF;
      btn.addEventListener("click", function () {
        // un seul Reel avec le son à la fois
        document.querySelectorAll(".phone video").forEach(function (o) {
          if (o !== v) { o.muted = true; var b = o.parentNode.querySelector(".sound"); if (b) { b.innerHTML = ICON_OFF; b.setAttribute("aria-pressed", "false"); } }
        });
        v.muted = !v.muted;
        if (!v.muted) v.play().catch(function () {});
        btn.innerHTML = v.muted ? ICON_OFF : ICON_ON;
        btn.setAttribute("aria-pressed", String(!v.muted));
        btn.setAttribute("aria-label", v.muted ? "Activer le son" : "Couper le son");
      });
    }
  });

  var vio = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      var v = en.target;
      if (en.isIntersecting && !reduce) { v.play().catch(function () {}); }
      else { v.pause(); }
    });
  }, { threshold: 0.4 });
  document.querySelectorAll(".phone video").forEach(function (v) { vio.observe(v); });

  /* ---------- Reels intégrés (iframe Facebook) : mise à l'échelle ---------- */
  function fitEmbed(box) { box.style.setProperty("--s", (box.clientWidth / 267).toFixed(4)); }
  var embeds = document.querySelectorAll(".phone .embed");
  if ("ResizeObserver" in window) {
    var ro = new ResizeObserver(function (es) { es.forEach(function (e) { fitEmbed(e.target); }); });
    embeds.forEach(function (b) { fitEmbed(b); ro.observe(b); });
  } else { embeds.forEach(fitEmbed); }

  /* ---------- Livre à feuilleter (rapport de stage) ---------- */
  document.querySelectorAll(".book").forEach(function (book) {
    var total = parseInt(book.getAttribute("data-pages"), 10);
    var tpl = book.getAttribute("data-src");
    var left = book.querySelector(".bk-left"), right = book.querySelector(".bk-right");
    var leaf = book.querySelector(".bk-leaf"), front = book.querySelector(".bk-front"), back = book.querySelector(".bk-back");
    var count = book.querySelector(".bk-count"), bPrev = book.querySelector(".bk-prev"), bNext = book.querySelector(".bk-next");
    var mq = window.matchMedia("(max-width: 700px)");
    var single = mq.matches, s = 0, p = 1, busy = false, maxS = Math.floor(total / 2);
    function src(n) { return tpl.replace("{n}", (n < 10 ? "0" : "") + n); }
    function set(box, n) {
      var img = box.querySelector("img");
      if (n < 1 || n > total) { box.classList.add("is-empty"); img.removeAttribute("src"); img.alt = ""; }
      else { box.classList.remove("is-empty"); img.src = src(n); img.alt = "Page " + n + " du rapport de stage"; }
    }
    function preload(n) { if (n >= 1 && n <= total) { new Image().src = src(n); } }
    function render() {
      book.classList.toggle("book--single", single);
      if (single) {
        set(right, p); preload(p + 1); preload(p - 1);
        count.textContent = "Page " + p + " sur " + total;
        bPrev.disabled = p <= 1; bNext.disabled = p >= total;
      } else {
        var l = 2 * s, r = 2 * s + 1;
        set(left, l); set(right, r);
        [l + 2, l + 3, l - 1, l - 2].forEach(preload);
        count.textContent = l < 1 ? "Couverture" : r > total ? "Page " + l + " sur " + total : "Pages " + l + "–" + r + " sur " + total;
        bPrev.disabled = s <= 0; bNext.disabled = s >= maxS;
      }
    }
    function flip(dir) {
      if (busy) return;
      if (single) { var np = p + dir; if (np < 1 || np > total) return; p = np; s = Math.floor(p / 2); render(); return; }
      var ns = s + dir; if (ns < 0 || ns > maxS) return;
      if (reduce) { s = ns; p = Math.max(1, 2 * s); render(); return; }
      busy = true;
      leaf.className = "bk-leaf " + (dir > 0 ? "from-right" : "from-left");
      if (dir > 0) { set(front, 2 * s + 1); set(back, 2 * s + 2); set(right, 2 * s + 3); }
      else { set(front, 2 * s); set(back, 2 * s - 1); set(left, 2 * s - 2); }
      leaf.style.transition = "none"; leaf.style.transform = "rotateY(0deg)"; leaf.hidden = false;
      void leaf.offsetWidth;
      leaf.style.transition = ""; leaf.style.transform = "rotateY(" + (dir > 0 ? -180 : 180) + "deg)";
      var done = false;
      function end() { if (done) return; done = true; s = ns; p = Math.max(1, 2 * s); render(); leaf.hidden = true; busy = false; }
      leaf.addEventListener("transitionend", end, { once: true });
      setTimeout(end, 900);
    }
    bPrev.addEventListener("click", function () { flip(-1); });
    bNext.addEventListener("click", function () { flip(1); });
    left.addEventListener("click", function () { flip(-1); });
    right.addEventListener("click", function (e) {
      if (single) { var r = right.getBoundingClientRect(); flip(e.clientX - r.left < r.width / 2 ? -1 : 1); }
      else { flip(1); }
    });
    book.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); flip(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); flip(-1); }
    });
    function onMode() { single = mq.matches; if (single) { p = Math.max(1, 2 * s); } else { s = Math.floor(p / 2); } render(); }
    if (mq.addEventListener) { mq.addEventListener("change", onMode); } else if (mq.addListener) { mq.addListener(onMode); }
    render();
  });

  /* ---------- Menu burger ---------- */
  var burger = document.querySelector(".burger");
  var menu = document.getElementById("menu");
  if (burger && menu) {
    function setMenu(open) {
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
      menu.hidden = !open;
      document.body.classList.toggle("menu-open", open);
      if (open) { var first = menu.querySelector("a"); if (first) first.focus(); }
    }
    burger.addEventListener("click", function () { setMenu(burger.getAttribute("aria-expanded") !== "true"); });
    menu.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { setMenu(false); }); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && !menu.hidden) { setMenu(false); burger.focus(); }
    });
  }

  /* ---------- Visionneuse ---------- */
  var lb = document.querySelector(".lightbox");
  if (lb) {
    var lbImg = lb.querySelector("img");
    var lbClose = lb.querySelector("button");
    var last = null;
    document.querySelectorAll("[data-zoom]").forEach(function (b) {
      b.addEventListener("click", function () {
        var img = b.querySelector("img");
        lbImg.src = img.currentSrc || img.src;
        lbImg.alt = img.alt;
        last = b;
        lb.classList.add("open");
        lbClose.focus();
      });
    });
    function close() { lb.classList.remove("open"); lbImg.removeAttribute("src"); if (last) last.focus(); }
    lbClose.addEventListener("click", close);
    lb.addEventListener("click", function (e) { if (e.target === lb) close(); });
    lb.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
  }
})();
