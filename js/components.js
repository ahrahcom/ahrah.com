(function () {
  const script = document.currentScript;
  const base = script && script.src ? script.src.replace(/js\/components\.js.*$/, "") : "/";
  const version = (script && script.src.match(/[?&]v=([^&]+)/) || [])[1];
  const qs = version ? "?v=" + encodeURIComponent(version) : "";

  function pageKey() {
    const path = location.pathname.replace(/\/+$/, "") || "/";
    if (path === "/" || /\/index(\.html)?$/i.test(path)) return "index";
    const file = path.split("/").pop() || "";
    return file.replace(/\.html$/i, "").toLowerCase();
  }

  function markCurrent(root) {
    const key = pageKey();
    const path = (location.pathname.replace(/\/+$/, "") || "/").toLowerCase();
    const home = key === "index";
    const onNotes = path === "/blog" || path === "/blog.html" || path.indexOf("/blog/") === 0;
    root.querySelectorAll("a[href]").forEach(function (link) {
      const raw = link.getAttribute("href") || "";
      if (raw.indexOf("#") !== -1) return;
      const name = (raw.split("/").pop() || "").replace(/\.html$/i, "").toLowerCase();
      if (name && name === key) link.setAttribute("aria-current", "page");
      if (onNotes && name === "blog") link.setAttribute("aria-current", "page");
    });
    if (home) {
      const logo = root.querySelector(".logo");
      const mark = root.querySelector(".footer-mark");
      if (logo) logo.setAttribute("href", "#top");
      if (mark) mark.setAttribute("href", "#top");
    }
  }

  function load(el, file, eventName) {
    if (el.dataset.ready) return;
    el.dataset.ready = "1";
    fetch(base + "partials/" + file + qs, { cache: "no-cache" })
      .then(function (res) {
        if (!res.ok) throw new Error(file);
        return res.text();
      })
      .then(function (html) {
        el.innerHTML = html;
        markCurrent(el);
        document.dispatchEvent(new Event(eventName));
      })
      .catch(function () {
        el.innerHTML = "<p class=\"sr-only\">Could not load " + file + "</p>";
      });
  }

  class SiteHeader extends HTMLElement {
    connectedCallback() {
      load(this, "header.html", "ahrah:header");
    }
  }

  class SiteFooter extends HTMLElement {
    connectedCallback() {
      load(this, "footer.html", "ahrah:footer");
    }
  }

  if (!customElements.get("site-header")) customElements.define("site-header", SiteHeader);
  if (!customElements.get("site-footer")) customElements.define("site-footer", SiteFooter);
})();
