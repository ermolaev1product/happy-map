# Happy Map Telegram bot

Existing bot: https://t.me/happymap_world_bot. Code is in this repository; **GitHub does not run the bot**. Deploy as a Cloudflare Worker. Do not create another Telegram bot.

## Current features in code
- /start greeting with Happy Map mission and Telegram keyboard
- Location request, opt-in, updates and /stop
- Hourly cron; send up to three nearest *real* events starting today after 18:00 in subscriber timezone, at local 18:00
- Distance by straight line, never invented drive/walk estimates
- No digest if the real events feed is unavailable or there are no eligible events

## Deployment checklist
1. From `telegram-bot/`: `npx wrangler kv namespace create SUBSCRIBERS`; set returned KV namespace ID in wrangler.toml (uncomment binding).
2. `npx wrangler secret put TELEGRAM_BOT_TOKEN` and `npx wrangler secret put WEBHOOK_SECRET`. Do not commit secrets. Generate a random webhook secret.
3. Set EVENTS_FEED_URL to an actual public HTTPS JSON events feed, containing an array or `{events:[...]}`. Events need `title`, `lat`, `lng`, `startAt` (ISO timestamp with timezone offset), `url`, `status`. Verify this feed reflects the production Happy Map catalog before enabling messages.
4. Deploy: `npx wrangler deploy`. Copy Worker HTTPS URL.
5. Set webhook securely with Telegram Bot API `setWebhook`, using `https://<worker-domain>/telegram` and the same secret_token. **Never share token in chat or logs.**
6. Test /start, location permission, /stop, real event selection, and one scheduled delivery; check timezone for non-Tbilisi users. Do not announce subscriptions before end-to-end test.

## Important limitation
Telegram location does not reveal the user's timezone. Current fallback is Asia/Tbilisi. Before global rollout, add timezone resolution from coordinates (or user selection) and persist it per subscriber. Worker currently uses last location sent, not continuous tracking. KV is eventually consistent and can occasionally duplicate a digest around concurrent cron runs; use a stronger per-day send lock for production scale.
