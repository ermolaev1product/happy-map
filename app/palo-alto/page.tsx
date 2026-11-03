import type {Metadata} from 'next';
export const metadata:Metadata={
  "title": "Happy Map — What’s happening around you?",
  "description": "Find concerts, exhibitions, talks and meetups nearby. Pick a plan, check the details and go.",
  "openGraph": {
    "title": "Happy Map — What’s happening around you?",
    "description": "Find concerts, exhibitions, talks and meetups nearby. Pick a plan, check the details and go.",
    "url": "https://happymap.app/palo-alto/invite-en.html",
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
    "title": "Happy Map — What’s happening around you?",
    "description": "Find concerts, exhibitions, talks and meetups nearby. Pick a plan, check the details and go.",
    "card": "summary_large_image",
    "images": [
      {
        "url": "https://happymap.app/assets/happy-map-unified-20261015-en.png",
        "alt": "Happy Map — Events. Places. Plans."
      }
    ]
  }
};
import {redirect} from 'next/navigation';
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){const p=await searchParams;const q=new URLSearchParams();for(const k of ['period','utm_source'])if(typeof p[k]==='string')q.set(k,p[k]);redirect('/palo-alto/index.html'+(q.size?'?'+q.toString():''));}
