import type {Metadata} from 'next';
export const metadata:Metadata={
  "title": "Happy Map — Москва: события и места",
  "description": "Концерты, лекции, театр, выставки и интересные места в Москве. Выбирай дату и сохраняй планы.",
  "openGraph": {
    "title": "Happy Map — Москва: события и места",
    "description": "Концерты, лекции, театр, выставки и интересные места в Москве. Выбирай дату и сохраняй планы.",
    "url": "https://happymap.app/moscow/invite.html",
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
    "title": "Happy Map — Москва: события и места",
    "description": "Концерты, лекции, театр, выставки и интересные места в Москве. Выбирай дату и сохраняй планы.",
    "card": "summary_large_image",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-ru.png",
        "alt": "Happy Map — События. Места. Планы."
      }
    ]
  }
};
import {redirect} from 'next/navigation';
export default function Page(){redirect('/moscow/index.html');}
