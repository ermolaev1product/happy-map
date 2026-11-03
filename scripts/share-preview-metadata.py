"""Update only social-preview tags, leaving page UI, links and canonical URLs intact."""
import re

PREVIEWS = {
    'ru': ('ru_RU', 'Happy Map — События. Места. Планы.'),
    'en': ('en_GB', 'Happy Map — Events. Places. Plans.'),
    'de': ('de_DE', 'Happy Map — Veranstaltungen. Orte. Pläne.'),
    'fr': ('fr_FR', 'Happy Map — Événements. Lieux. Sorties.'),
    'it': ('it_IT', 'Happy Map — Eventi. Luoghi. Programmi.'),
}

def update_preview(html, language=None):
    if not re.search(r'<meta\b[^>]*(?:property|name)=[\"\'](?:og:image|twitter:image)[\"\']', html, re.I):
        return html
    if language is None:
        match = re.search(r'<html\b[^>]*lang=[\"\']([^\"\']+)', html, re.I)
        language = match[1].split('-')[0] if match else 'ru'
    locale, alt = PREVIEWS[language]
    image = f'https://happymap.app/assets/happy-map-unified-20261015-{language}.png'
    fields = {'og:image': image, 'twitter:image': image, 'og:image:width': '1200',
              'og:image:height': '630', 'og:image:alt': alt, 'twitter:image:alt': alt,
              'og:locale': locale, 'twitter:card': 'summary_large_image'}
    for key, value in fields.items():
        pattern = r'<meta\b[^>]*(?:property|name)=[\"\']' + re.escape(key) + r'[\"\'][^>]*>'
        tag = f'<meta {"property" if key.startswith("og:") else "name"}="{key}" content="{value}">'
        if re.search(pattern, html, re.I):
            html = re.sub(pattern, lambda _: tag, html, flags=re.I)
        else:
            # Some historical entry pages omit </head>; insert beside the existing OG image.
            anchor = re.search(r'<meta\b[^>]*property="og:image"[^>]*>', html, re.I)
            html = html[:anchor.end()] + '\n' + tag + html[anchor.end():]
    return html

if __name__ == '__main__':
    from pathlib import Path
    root = Path(__file__).resolve().parents[1]
    count = 0
    for file in (root / 'public').rglob('*.html'):
        before = file.read_text()
        after = update_preview(before)
        if after != before:
            file.write_text(after)
            count += 1
    print(f'Updated social-preview metadata in {count} HTML pages')
