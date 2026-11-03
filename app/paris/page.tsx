import type {Metadata} from "next";
import {redirect} from "next/navigation";
export const metadata:Metadata={
  "title": "Happy Map — Paris: Events and Places",
  "description": "Discover concerts, talks, theatre, exhibitions and meetups in Paris. Check admission details and save your plans.",
  "openGraph": {
    "title": "Happy Map — Paris: Events and Places",
    "description": "Discover concerts, talks, theatre, exhibitions and meetups in Paris. Check admission details and save your plans.",
    "url": "https://happymap.app/paris/invite-en.html",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-en.png",
        "width": 1200,
        "height": 630,
        "alt": "Happy Map — Events. Places. Plans."
      }
    ],
    "locale": "en_GB"
  },
  "twitter": {
    "title": "Happy Map — Paris: Events and Places",
    "description": "Discover concerts, talks, theatre, exhibitions and meetups in Paris. Check admission details and save your plans.",
    "card": "summary_large_image",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-en.png",
        "alt": "Happy Map — Events. Places. Plans."
      }
    ]
  }
};
export default function Page(){redirect("/paris/index.html");}
