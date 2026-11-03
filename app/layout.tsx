import type { Metadata } from 'next';
export const metadata:Metadata={
  "title": "Happy Map — открой свой город",
  "description": "Выставки, концерты, встречи и новые любимые места — на одной карте. Узнай, что происходит рядом, выбирай, куда пойти, и собирай свои планы.",
  "openGraph": {
    "title": "Happy Map — открой свой город",
    "description": "Выставки, концерты, встречи и новые любимые места — на одной карте. Узнай, что происходит рядом, выбирай, куда пойти, и собирай свои планы.",
    "type": "website",
    "siteName": "Happy Map",
    "url": "https://happymap.app/",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-ru.png",
        "width": 1200,
        "height": 630,
        "alt": "Happy Map — События. Места. Планы."
      }
    ],
    "locale": "ru_RU"
  },
  "twitter": {
    "title": "Happy Map — открой свой город",
    "description": "Выставки, концерты, встречи и новые любимые места — на одной карте. Узнай, что происходит рядом, выбирай, куда пойти, и собирай свои планы.",
    "card": "summary_large_image",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-ru.png",
        "alt": "Happy Map — События. Места. Планы."
      }
    ]
  }
};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>;}
