// SPDX-License-Identifier: Apache-2.0
//
// Recorded-evidence animation layer for the Blackbox launch site.
//
// This file only plays back a real, pre-recorded Blackbox CLI run. It performs
// NO verification: the PASS / FAIL states, the axis verdicts, and the byte flip
// are fixed facts transcribed from the recording (see the "Full output"
// screenshot and the downloadable evidence). Nothing here signs, verifies, or
// alters any receipt — it reveals static text on a timer.
//
// Everything is same-origin and works under the strict CSP (no inline code, no
// eval, no external requests). prefers-reduced-motion disables all motion and
// leaves the complete factual state on screen.
(function () {
  "use strict";

  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Lightbox, video, and the manual CLI walkthrough run regardless of motion
  // preference (the walkthrough is user-controlled, with no timed motion).
  setupLightbox();
  setupVideo();
  setupWalkthrough();
  setupEngRail();

  // Motion-driven playback is opt-in and skipped entirely for reduced motion:
  // the markup already shows the full static state without these classes.
  if (!reduce) {
    setupTerminal();
    setupGate();
  }

  // -------------------------------------------------------------------------
  // Recorded terminal playback + axes illumination + byte flip
  // -------------------------------------------------------------------------
  function setupTerminal() {
    var term = document.getElementById("playground");
    var axes = document.getElementById("axes-panel");
    if (!term) return;

    var cleanLines = toArray(document.querySelectorAll("#term-clean .ln"));
    var tamperedLines = toArray(document.querySelectorAll("#term-tampered .ln"));
    var verdicts = toArray(document.querySelectorAll("#axes-panel .verdict"));
    var byteviz = document.getElementById("byteviz");
    var flipCell = document.getElementById("flip-cell");
    if (!cleanLines.length) return;

    term.classList.add("is-anim");
    if (axes) axes.classList.add("is-anim");

    var timers = [];
    var running = false;

    function at(ms, fn) { timers.push(window.setTimeout(fn, ms)); }
    function clearTimers() {
      for (var i = 0; i < timers.length; i++) window.clearTimeout(timers[i]);
      timers = [];
    }

    function reset() {
      cleanLines.concat(tamperedLines).forEach(function (l) {
        l.classList.remove("show", "flash");
      });
      verdicts.forEach(function (v) { v.classList.remove("lit"); });
      if (byteviz) byteviz.classList.remove("show");
      if (flipCell) { flipCell.classList.remove("flipped"); flipCell.textContent = "02"; }
    }

    function revealAll() {
      cleanLines.concat(tamperedLines).forEach(function (l) { l.classList.add("show"); });
      verdicts.forEach(function (v) { v.classList.add("lit"); });
      if (byteviz) byteviz.classList.add("show");
      if (flipCell) { flipCell.classList.add("flipped"); flipCell.textContent = "03"; }
    }

    function play() {
      clearTimers();
      reset();
      var t = 350;

      // Clean verify: reveal lines; light the matching axis as its row appears.
      // Rows 5..11 of the clean block are cryptographic..chain -> verdicts 0..6.
      cleanLines.forEach(function (ln, i) {
        at(t, function () {
          ln.classList.add("show");
          var axisIdx = i - 5;
          if (axisIdx >= 0 && axisIdx < verdicts.length) verdicts[axisIdx].classList.add("lit");
        });
        t += ln.classList.contains("sp") ? 55 : (i === 0 ? 220 : 135);
      });

      // Byte visualization: reveal, then flip offset 188 from 02 to 03.
      t += 750;
      at(t, function () { if (byteviz) byteviz.classList.add("show"); });
      t += 550;
      at(t, function () {
        if (flipCell) { flipCell.classList.add("flipped"); flipCell.textContent = "03"; }
      });

      // Tampered verify: reveal lines; flash the composite FAIL and crypto FAIL rows.
      t += 800;
      tamperedLines.forEach(function (ln, i) {
        at(t, function () {
          ln.classList.add("show");
          if (i === 1 || i === 5) ln.classList.add("flash"); // composite FAIL, cryptographic FAIL
        });
        t += ln.classList.contains("sp") ? 55 : 135;
      });

      // Hold, then loop.
      t += 2600;
      at(t, play);
    }

    if ("IntersectionObserver" in window) {
      // The terminal is taller than the viewport, so intersectionRatio stays low
      // even when centered. Keep playing while any part is visible; pause only
      // when it leaves the viewport entirely so no hidden timers keep burning.
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          var e = entries[i];
          if (e.isIntersecting) {
            if (!running) { running = true; play(); }
          } else {
            running = false;
            clearTimers();
          }
        }
      }, { rootMargin: "0px 0px -15% 0px", threshold: 0 });
      io.observe(term);
    } else {
      revealAll();
    }
  }

  // -------------------------------------------------------------------------
  // Gate flow illustration — plays once when scrolled into view
  // -------------------------------------------------------------------------
  function setupGate() {
    var flow = document.getElementById("gate-flow");
    if (!flow) return;
    flow.classList.add("is-anim");
    var items = toArray(flow.children);
    var played = false;

    function run() {
      if (played) return;
      played = true;
      var t = 0;
      items.forEach(function (el) {
        window.setTimeout(function () { el.classList.add("shown"); }, t);
        t += 260;
      });
    }

    if ("IntersectionObserver" in window) {
      var io = new IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { run(); io.disconnect(); break; }
        }
      }, { threshold: 0.3 });
      io.observe(flow);
    } else {
      run();
    }
  }

  // -------------------------------------------------------------------------
  // Recording: play in viewport, pause offscreen
  // -------------------------------------------------------------------------
  function setupVideo() {
    var v = document.getElementById("demo-video");
    if (!v || !("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        var e = entries[i];
        if (e.isIntersecting && e.intersectionRatio > 0.3) {
          if (!reduce) {
            var p = v.play();
            if (p && typeof p.catch === "function") p.catch(function () {});
          }
        } else {
          v.pause();
        }
      }
    }, { threshold: [0, 0.3, 0.6] });
    io.observe(v);
  }

  // -------------------------------------------------------------------------
  // Accessible lightbox for the full-output screenshot
  // -------------------------------------------------------------------------
  function setupLightbox() {
    var trigger = document.getElementById("shot-trigger");
    var box = document.getElementById("lightbox");
    var closeBtn = document.getElementById("lightbox-close");
    if (!trigger || !box || !closeBtn) return;
    var lastFocus = null;

    function open() {
      lastFocus = document.activeElement;
      box.hidden = false;
      document.body.style.overflow = "hidden";
      closeBtn.focus();
      document.addEventListener("keydown", onKey, true);
    }
    function close() {
      box.hidden = true;
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey, true);
      if (lastFocus && typeof lastFocus.focus === "function") lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === "Escape" || e.key === "Esc") { e.preventDefault(); close(); }
      else if (e.key === "Tab") { e.preventDefault(); closeBtn.focus(); } // one focusable: trap here
    }

    trigger.addEventListener("click", open);
    closeBtn.addEventListener("click", close);
    box.addEventListener("click", function (e) { if (e.target === box) close(); });
  }

  // -------------------------------------------------------------------------
  // Six-step CLI walkthrough — user-controlled Previous / Next only.
  // No autoplay, no looping, no timers. Content switches instantly, so it is
  // fully correct under prefers-reduced-motion with no special handling.
  // -------------------------------------------------------------------------
  function setupWalkthrough() {
    var section = document.getElementById("walkthrough");
    if (!section) return;
    var steps = toArray(section.querySelectorAll(".wt-step"));
    var markers = toArray(section.querySelectorAll(".wt-marker"));
    var prev = section.querySelector(".wt-prev");
    var next = section.querySelector(".wt-next");
    var curEl = section.querySelector(".wt-cur");
    var feedback = section.querySelector(".wt-srfeedback");
    if (!steps.length || !prev || !next) return;
    var total = steps.length;
    var i = 0;

    function render(announce) {
      for (var s = 0; s < steps.length; s++) steps[s].hidden = (s !== i);
      for (var m = 0; m < markers.length; m++) {
        if (m === i) markers[m].setAttribute("aria-current", "step");
        else markers[m].removeAttribute("aria-current");
        markers[m].classList.toggle("is-active", m === i);
        markers[m].classList.toggle("is-done", m < i);
      }
      if (curEl) curEl.textContent = String(i + 1);
      prev.disabled = (i === 0);
      if (i === total - 1) { next.disabled = true; next.textContent = "Done"; }
      else { next.disabled = false; next.textContent = "Next"; }
      if (announce && feedback) {
        var label = markers[i] ? markers[i].querySelector(".wt-mlabel").textContent : "";
        feedback.textContent = "Step " + (i + 1) + " of " + total + ": " + label;
      }
    }

    prev.addEventListener("click", function () {
      if (i > 0) { i--; render(true); if (prev.disabled) next.focus(); }
    });
    next.addEventListener("click", function () {
      if (i < total - 1) { i++; render(true); if (next.disabled) prev.focus(); }
    });

    toArray(section.querySelectorAll(".wt-copy")).forEach(function (btn) {
      btn.addEventListener("click", function () {
        var row = btn.closest(".wt-cmdrow");
        var code = row ? row.querySelector("code") : null;
        if (code) copyText(code.textContent, btn, feedback);
      });
    });

    render(false);
  }

  function copyText(text, btn, feedback) {
    function done(ok) {
      btn.textContent = ok ? "Copied" : "Copy failed";
      if (feedback) feedback.textContent = ok ? "Command copied to clipboard" : "Copy failed — select the command to copy it manually";
      window.setTimeout(function () { btn.textContent = "Copy"; }, 1600);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { fallbackCopy(text, done); });
    } else {
      fallbackCopy(text, done);
    }
  }

  function fallbackCopy(text, done) {
    try {
      var ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.className = "wt-offscreen";
      document.body.appendChild(ta);
      ta.select();
      var ok = document.execCommand && document.execCommand("copy");
      document.body.removeChild(ta);
      done(!!ok);
    } catch (e) { done(false); }
  }

  // -------------------------------------------------------------------------
  // Chapter 2 orientation rail — scroll-spy only (no motion). Shows while any
  // engineering section is on screen; marks the current section active +
  // aria-current so the state does not depend on colour alone.
  // -------------------------------------------------------------------------
  function setupEngRail() {
    var rail = document.getElementById("eng-rail");
    if (!rail) return;
    var links = toArray(rail.querySelectorAll("a"));
    var sections = links
      .map(function (a) { return document.getElementById(a.getAttribute("href").slice(1)); })
      .filter(Boolean);
    if (!sections.length) return;

    function setActive(id) {
      for (var i = 0; i < links.length; i++) {
        var on = links[i].getAttribute("href") === "#" + id;
        links[i].classList.toggle("active", on);
        if (on) links[i].setAttribute("aria-current", "true");
        else links[i].removeAttribute("aria-current");
      }
    }

    var ticking = false;
    function update() {
      ticking = false;
      var vh = window.innerHeight;
      var line = vh * 0.4; // the section whose top is last above this line is "current"
      var firstTop = sections[0].getBoundingClientRect().top;
      var lastBottom = sections[sections.length - 1].getBoundingClientRect().bottom;
      var inChapter2 = firstTop < vh && lastBottom > 0;
      rail.hidden = !inChapter2;
      if (!inChapter2) return;
      var activeId = sections[0].id;
      for (var i = 0; i < sections.length; i++) {
        if (sections[i].getBoundingClientRect().top <= line) activeId = sections[i].id;
      }
      setActive(activeId);
    }
    function onScroll() {
      if (!ticking) { ticking = true; window.requestAnimationFrame(update); }
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    update();
  }

  function toArray(nodeList) { return Array.prototype.slice.call(nodeList); }
})();
