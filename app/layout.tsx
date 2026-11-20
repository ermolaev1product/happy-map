import type { Metadata } from 'next';
export const metadata:Metadata={
  "title": "Happy Map — Настоящие люди. Настоящая близость.",
  "description": "Настоящие места. Настоящие люди. Настоящая близость. В твоём городе. Рядом с тобой. Находи события, встречай людей и проводи время вместе.",
  "openGraph": {
    "title": "Happy Map — Настоящие люди. Настоящая близость.",
    "description": "Настоящие места. Настоящие люди. Настоящая близость. В твоём городе. Рядом с тобой. Находи события, встречай людей и проводи время вместе.",
    "type": "website",
    "siteName": "Happy Map",
    "url": "https://happymap.app/",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-ru.png",
        "width": 1200,
        "height": 630,
        "alt": "Happy Map — Настоящие места. Настоящие люди. Настоящая близость."
      }
    ],
    "locale": "ru_RU"
  },
  "twitter": {
    "title": "Happy Map — Настоящие люди. Настоящая близость.",
    "description": "Настоящие места. Настоящие люди. Настоящая близость. В твоём городе. Рядом с тобой. Находи события, встречай людей и проводи время вместе.",
    "card": "summary_large_image",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-ru.png",
        "alt": "Happy Map — Настоящие места. Настоящие люди. Настоящая близость."
      }
    ]
  }
};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="ru"><body>{children}</body></html>;}
