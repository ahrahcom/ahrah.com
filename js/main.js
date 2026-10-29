(function () {
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const header = document.getElementById("site-header");
  const toggle = document.getElementById("menu-toggle");
  const menu = document.getElementById("site-menu");

  function setMenu(open) {
    menu.classList.toggle("is-open", open);
    document.body.classList.toggle("menu-open", open);
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    if (open) setTimeout(function () { menu.querySelector("a").focus({ preventScroll: true }); }, 60);
  }

  if (toggle && menu) {
    menu.hidden = false;
    toggle.addEventListener("click", function () {
      setMenu(!menu.classList.contains("is-open"));
    });
    menu.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false); });
    });
    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" && menu.classList.contains("is-open")) {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  function onScroll() {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 24);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  document.querySelectorAll(".split").forEach(function (el) {
    const words = el.textContent.trim().split(/\s+/);
    el.setAttribute("aria-label", el.textContent.trim());
    el.textContent = "";
    words.forEach(function (word, i) {
      const outer = document.createElement("span");
      outer.className = "w";
      outer.setAttribute("aria-hidden", "true");
      const inner = document.createElement("span");
      inner.textContent = word;
      inner.style.transitionDelay = (0.1 + i * 0.06) + "s";
      outer.appendChild(inner);
      el.appendChild(outer);
      if (i < words.length - 1) el.appendChild(document.createTextNode(" "));
    });
    el.classList.add("is-split");
  });

  function countUp(el) {
    const target = Number(el.getAttribute("data-count"));
    if (reduced || !target) return;
    const label = document.createElement("span");
    label.className = "sr-only";
    label.textContent = el.textContent;
    el.setAttribute("aria-hidden", "true");
    el.after(label);
    const start = performance.now();
    const duration = 1400;
    el.textContent = "0";
    (function step(now) {
      const p = Math.min(1, (now - start) / duration);
      el.textContent = String(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(step);
    })(start);
  }

  requestAnimationFrame(function () {
    requestAnimationFrame(function () {
      root.classList.add("is-ready");
      document.querySelectorAll(".hero [data-count]").forEach(countUp);
    });
  });

  const revealables = document.querySelectorAll("[data-reveal]");
  if ("IntersectionObserver" in window && !reduced) {
    const observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        entry.target.querySelectorAll("[data-count]").forEach(countUp);
        observer.unobserve(entry.target);
      });
    }, { rootMargin: "0px 0px -12% 0px", threshold: 0.08 });
    revealables.forEach(function (el) { observer.observe(el); });
  } else {
    revealables.forEach(function (el) { el.classList.add("is-in"); });
  }

  const stats = document.querySelector(".hero-stats");
  const mobile = window.matchMedia("(max-width: 720px)");
  if (stats && !reduced) {
    const items = stats.children;
    let pausedUntil = 0;
    const pause = function () { pausedUntil = Date.now() + 6000; };
    stats.addEventListener("pointerdown", pause, { passive: true });
    stats.addEventListener("touchstart", pause, { passive: true });
    setInterval(function () {
      if (!mobile.matches || document.hidden || Date.now() < pausedUntil || items.length < 2) return;
      const box = stats.getBoundingClientRect();
      const middle = box.left + box.width / 2;
      const offset = function (item) {
        const r = item.getBoundingClientRect();
        return r.left + r.width / 2 - middle;
      };
      let current = 0;
      for (let i = 1; i < items.length; i++) {
        if (Math.abs(offset(items[i])) < Math.abs(offset(items[current]))) current = i;
      }
      const next = items[(current + 1) % items.length];
      stats.scrollTo({ left: stats.scrollLeft + offset(next), behavior: "smooth" });
    }, 3000);
  }

  const rail = document.getElementById("work-rail");
  if (rail) {
    let down = false;
    let moved = false;
    let startX = 0;
    let startLeft = 0;
    rail.addEventListener("pointerdown", function (event) {
      if (event.pointerType !== "mouse") return;
      down = true;
      moved = false;
      startX = event.clientX;
      startLeft = rail.scrollLeft;
    });
    window.addEventListener("pointermove", function (event) {
      if (!down) return;
      const dx = event.clientX - startX;
      if (!moved && Math.abs(dx) > 5) {
        moved = true;
        rail.classList.add("is-dragging");
      }
      if (moved) rail.scrollLeft = startLeft - dx;
    });
    window.addEventListener("pointerup", function () {
      if (!down) return;
      down = false;
      requestAnimationFrame(function () { rail.classList.remove("is-dragging"); });
    });
    rail.addEventListener("click", function (event) {
      if (moved) {
        event.preventDefault();
        moved = false;
      }
    }, true);
    rail.addEventListener("dragstart", function (event) { event.preventDefault(); });
  }

  document.querySelectorAll("[data-prefill]").forEach(function (link) {
    link.addEventListener("click", function () {
      const message = document.getElementById("message");
      if (message && !message.value.trim()) {
        message.value = "We want to talk about " + link.getAttribute("data-prefill") + ". ";
      }
    });
  });

  const form = document.getElementById("quote-form");
  if (form) {
    form.dataset.startedAt = String(Date.now());
    form.addEventListener("submit", async function (event) {
      event.preventDefault();
      if (form.company_website && form.company_website.value) return;
      let valid = true;
      form.querySelectorAll("[required]").forEach(function (field) {
        const wrap = field.closest(".field");
        const bad = !field.value.trim() || (field.type === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value));
        if (wrap) wrap.classList.toggle("is-invalid", bad);
        if (bad) valid = false;
      });
      const status = document.getElementById("form-status");
      if (!valid) {
        if (status) status.textContent = "Add the required fields, including a valid work email.";
        return;
      }
      const data = new FormData(form);
      const payload = {
        name: data.get("name"),
        company: data.get("company"),
        email: data.get("email"),
        phone: data.get("phone") || "",
        message: data.get("message"),
        company_website: data.get("company_website") || "",
        startedAt: Number(form.dataset.startedAt || 0)
      };
      const mailtoBody = [
        "Name: " + payload.name,
        "Company: " + payload.company,
        "Email: " + payload.email,
        "Phone: " + (payload.phone || "Not provided"),
        "",
        payload.message
      ].join("\n");
      const mailto = "mailto:business@ahrah.com?subject=" + encodeURIComponent("Ahrah project enquiry from " + payload.company) + "&body=" + encodeURIComponent(mailtoBody);
      const local = location.hostname === "localhost" || location.hostname === "127.0.0.1";
      const apiBase = local ? "http://127.0.0.1:8787" : "https://api.ahrah.com";
      const endpoint = apiBase + "/api/contact";
      const button = form.querySelector("button[type=submit]");
      if (button) button.disabled = true;
      if (status) status.textContent = "Sending...";
      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: AbortSignal.timeout(15000)
        });
        let result = {};
        try { result = await response.json(); } catch (ignore) { result = {}; }
        if (response.ok && result.ok) {
          form.reset();
          form.dataset.startedAt = String(Date.now());
          if (status) status.textContent = "Thanks. We have your message and will reply within one business day.";
          return;
        }
        const safe = typeof result.error === "string" && result.error.length < 180 ? result.error : "We could not send that message.";
        if (status) status.textContent = safe + " You can also email business@ahrah.com.";
      } catch (ignore) {
        if (status) status.textContent = "Your email app should open with this message. If it does not, write to business@ahrah.com.";
        window.location.href = mailto;
      } finally {
        if (button) button.disabled = false;
      }
    });
  }
})();
