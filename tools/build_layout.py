"""Copy the shared header and footer into every page.

Edit partials/header.html or partials/footer.html, then run:
    python tools/build_layout.py
"""
import pathlib
import re

ROOT = pathlib.Path(__file__).resolve().parent.parent
PAGES = ["index.html", "about.html", "privacy.html", "terms.html"]
PARTIALS = {"header": "partials/header.html", "footer": "partials/footer.html"}


def render(html, page):
    if page == "index.html":
        html = html.replace('href="index.html#', 'href="#')
        html = html.replace('class="logo" href="index.html"', 'class="logo" href="#top"')
    html = html.replace(f'<a href="{page}">', f'<a href="{page}" aria-current="page">')
    return html.rstrip("\n")


def build():
    for page in PAGES:
        path = ROOT / page
        text = path.read_text(encoding="utf-8")
        for name, source in PARTIALS.items():
            block = render((ROOT / source).read_text(encoding="utf-8"), page)
            pattern = re.compile(rf"(<!-- @{name} -->).*?(\s*<!-- /@{name} -->)", re.S)
            if not pattern.search(text):
                raise SystemExit(f"{page}: missing <!-- @{name} --> ... <!-- /@{name} --> markers")
            text = pattern.sub(lambda m: m.group(1) + "\n" + block + m.group(2), text, count=1)
        path.write_text(text, encoding="utf-8", newline="")
        print(f"updated {page}")


if __name__ == "__main__":
    build()
