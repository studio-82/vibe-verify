"""Static release checks. Run from any directory; no browser automation needed."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import re

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, path):
        super().__init__()
        self.path = path
        self.ids = set()
        self.links = []
        self.references = []
        self.buttons = []
        self.headings = 0
        self.feed(path.read_text())

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            assert attrs['id'] not in self.ids, f'Duplicate ID: {attrs["id"]}'
            self.ids.add(attrs['id'])
        for name in ('src', 'href'):
            if name in attrs:
                self.links.append(attrs[name])
        for name in ('aria-labelledby', 'aria-describedby'):
            self.references.extend(attrs.get(name, '').split())
        if tag == 'img':
            assert attrs.get('alt'), f'Missing image description in {self.path.name}'
            assert attrs.get('width') and attrs.get('height'), 'Reserve image dimensions'
        if tag == 'h1':
            self.headings += 1
        if tag == 'button' and 'button' in attrs.get('class', '').split():
            self.buttons.append(attrs)


pages = {path.name: Page(path) for path in ROOT.glob('*.html')}
for name, page in pages.items():
    assert page.headings == 1, f'{name}: expected one page heading'
    for reference in page.references:
        assert reference in page.ids, f'{name}: missing accessible description {reference}'
    for link in page.links:
        url = urlsplit(link)
        if url.scheme or url.netloc:
            assert url.scheme in ('https', 'mailto'), f'Unexpected external protocol: {link}'
            continue
        target = ROOT / unquote(url.path) if url.path else page.path
        assert target.is_file(), f'{name}: missing file {target}'
        if url.fragment and target.suffix == '.html':
            assert url.fragment in pages[target.name].ids, f'{name}: broken anchor {link}'

assert len(pages['index.html'].buttons) == 2
assert all('disabled' in button for button in pages['index.html'].buttons), 'Keep checkout unavailable'
assert ROOT.joinpath('CNAME').read_text().strip() == 'vibeverify.s82.studio'
assert ROOT.joinpath('assets/Manrope-OFL.txt').is_file()
assert '$15' in ROOT.joinpath('index.html').read_text()
for css in ROOT.glob('*.css'):
    for asset in re.findall(r'url\(["\']?([^\)"\']+)', css.read_text()):
        assert ROOT.joinpath(asset).is_file(), f'{css.name}: missing asset {asset}'
print(f'PASS: {len(pages)} pages, links, anchors, image dimensions, accessibility references, font licence, $15 disabled checkout, domain.')
