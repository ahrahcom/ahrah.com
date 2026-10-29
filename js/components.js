(function () {
  const script = document.currentScript;
  const base = script && script.src ? script.src.replace(/js\/components\.js.*$/, "") : "/";

  function pageKey() {
    const file = (location.pathname.replace(/\/+$/, "") || "/index.html").split("/").pop() || "index.html";
    const name = file.replace(/\.html$/i, "");
    return name === "" ? "index" : name.toLowerCase();
  }

  function markCurrent(root) {
    const key = pageKey();
    const home = key === "index" || key === "ahrah.com";
    root.querySelectorAll("a[href]").forEach(function (link) {
      const raw = link.getAttribute("href") || "";
      if (raw.indexOf("#") !== -1) return;
      const name = raw.split("/").pop().replace(/\.html$/i, "").toLowerCase();
      if (name && name === key) link.setAttribute("aria-current", "page");
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
    fetch(base + "partials/" + file, { cache: "force-cache" })
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
