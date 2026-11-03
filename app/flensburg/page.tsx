import {redirect} from "next/navigation";
export const metadata={
  "title": "Happy Map — Dein Flensburg. Deine Pläne.",
  "description": "Entdecke Konzerte, Cafés und neue Lieblingsorte in Flensburg. Zum Beispiel: Lisa Wilhelm Quartett am 18. Oktober 2026 um 11 Uhr im NORDER147.",
  "openGraph": {
    "title": "Happy Map — Dein Flensburg. Deine Pläne.",
    "description": "Entdecke Konzerte, Cafés und neue Lieblingsorte in Flensburg. Zum Beispiel: Lisa Wilhelm Quartett am 18. Oktober 2026 um 11 Uhr im NORDER147.",
    "locale": "de_DE",
    "url": "https://happymap.app/flensburg/",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-de.png",
        "width": 1200,
        "height": 630,
        "alt": "Happy Map — Veranstaltungen. Orte. Pläne."
      }
    ]
  },
  "twitter": {
    "title": "Happy Map — Dein Flensburg. Deine Pläne.",
    "description": "Entdecke Konzerte, Cafés und neue Lieblingsorte in Flensburg. Zum Beispiel: Lisa Wilhelm Quartett am 18. Oktober 2026 um 11 Uhr im NORDER147.",
    "card": "summary_large_image",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-de.png",
        "alt": "Happy Map — Veranstaltungen. Orte. Pläne."
      }
    ]
  }
};
export default function Page(){redirect("/flensburg/index.html");}
