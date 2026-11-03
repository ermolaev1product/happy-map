import type {Metadata} from 'next';
export const metadata:Metadata={
  "title": "Happy Map — открой свой Белград",
  "description": "Белград, в который хочется выйти: выставки, концерты, встречи и любимые места на одной карте. Выбирай, куда пойти, и собирай свои планы.",
  "openGraph": {
    "title": "Happy Map — открой свой Белград",
    "description": "Белград, в который хочется выйти: выставки, концерты, встречи и любимые места на одной карте. Выбирай, куда пойти, и собирай свои планы.",
    "url": "https://happymap.app/belgrade/",
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
    "title": "Happy Map — открой свой Белград",
    "description": "Белград, в который хочется выйти: выставки, концерты, встречи и любимые места на одной карте. Выбирай, куда пойти, и собирай свои планы.",
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
export default function Page(){redirect('/belgrade/index.html');}
