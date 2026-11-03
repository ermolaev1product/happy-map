import type {Metadata} from 'next';
import {redirect} from 'next/navigation';
export const metadata:Metadata={
  "title": "Happy Map — открой свой город",
  "description": "Выставки, концерты, встречи и новые любимые места — на одной карте. Узнай, что происходит рядом, выбирай, куда пойти, и собирай свои планы.",
  "alternates": {
    "canonical": "https://happymap.app/map"
  },
  "openGraph": {
    "title": "Happy Map — открой свой город",
    "description": "Выставки, концерты, встречи и новые любимые места — на одной карте. Узнай, что происходит рядом, выбирай, куда пойти, и собирай свои планы.",
    "url": "https://happymap.app/map",
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
export default function Page(){redirect('/map.html');}
