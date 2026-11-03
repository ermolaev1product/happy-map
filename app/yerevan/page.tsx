import {redirect} from "next/navigation";
export const metadata={
  "title": "Happy Map — Yerevan",
  "description": "Discover events, cafés and new favourite places in Yerevan. Make plans on one map.",
  "openGraph": {
    "title": "Happy Map — Yerevan",
    "description": "Discover events, cafés and new favourite places in Yerevan. Make plans on one map.",
    "locale": "en_GB",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-en.png",
        "width": 1200,
        "height": 630,
        "alt": "Happy Map — Events. Places. Plans."
      }
    ]
  },
  "twitter": {
    "title": "Happy Map — Yerevan",
    "description": "Discover events, cafés and new favourite places in Yerevan. Make plans on one map.",
    "card": "summary_large_image",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-en.png",
        "alt": "Happy Map — Events. Places. Plans."
      }
    ]
  }
};
export default function Page(){redirect("/yerevan/index.html");}
