import {redirect} from "next/navigation";
export const metadata={
  "title": "Happy Map — Toronto: Events and Places",
  "description": "Discover verified events and interesting places in Toronto. Choose where to go and save your plans.",
  "openGraph": {
    "title": "Happy Map — Toronto: Events and Places",
    "description": "Discover verified events and interesting places in Toronto. Choose where to go and save your plans.",
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
    "title": "Happy Map — Toronto: Events and Places",
    "description": "Discover verified events and interesting places in Toronto. Choose where to go and save your plans.",
    "card": "summary_large_image",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-en.png",
        "alt": "Happy Map — Events. Places. Plans."
      }
    ]
  }
};
export default function Page(){redirect("/toronto/index.html");}
