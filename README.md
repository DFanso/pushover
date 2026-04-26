# pushover

Small proof of concept for sending ecommerce-style notifications through [Pushover](https://pushover.net/) before wiring the flow into a larger app.

## What this POC includes

- a tiny Express server that sends messages through the Pushover Message API
- a browser page that triggers a test order/cart-style notification
- environment-based credentials so app tokens and group/user keys are not hard-coded

## Quick start

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a Pushover application at `https://pushover.net/apps/build` and copy its API token.

3. Copy `.env.example` to `.env`, then set:

   ```bash
   PUSHOVER_APP_TOKEN=your_app_api_token
   PUSHOVER_GROUP_KEY=your_group_key
   ```

4. Start the demo:

   ```bash
   npm start
   ```

5. Open `http://localhost:3000` in Chrome or Edge.

## Files

- `server.js` - serves the app and sends notifications to Pushover
- `public/client.js` - posts the test notification payload to the local server
- `public/index.html` - simple form for title, message, URL, URL title, priority, and sound

## iPhone notification troubleshooting

If the Pushover API accepts the message but your iPhone does not play a sound or show a banner, check these in order:

1. In iOS, open **Settings → Notifications → Pushover** and confirm **Allow Notifications**, **Sounds**, and the desired alert style are enabled.
2. Lock the phone or background the Pushover app. If the Pushover app is open on screen, it can receive the message without generating a system banner/sound.
3. Check iOS **Focus / Do Not Disturb**. Pushover priority can bypass Pushover quiet hours, but it cannot override iOS Focus rules.
4. In the Pushover app, check alert settings and quiet hours. Normal priority `0` messages received during Pushover quiet hours are treated like low-priority silent messages.
5. Try priority `1` for a test message. It bypasses Pushover quiet hours, but should be used carefully for real ecommerce events.
6. Try setting the form's **Sound** field to `pushover` or `cashregister`. Do not use `none` unless you want a silent notification.
7. If you set `PUSHOVER_DEVICES`, make sure each value exactly matches a device name shown in your Pushover dashboard.

## Group, users, and devices

For this POC, use your delivery group key as the recipient:

```bash
PUSHOVER_GROUP_KEY=your_group_key
```

Pushover accepts a group key in the same `user` parameter used for an individual user key. The server sends `PUSHOVER_GROUP_KEY` directly as `user=your_group_key`, so everyone active in that delivery group receives the message without listing each user key.

If you want to test individual users instead, use comma-separated values with no spaces:

```bash
PUSHOVER_RECIPIENT_KEYS=user_key_1,user_key_2,user_key_3
PUSHOVER_DEVICES=iphone,ipad
```

The POC sends one API request per user. That keeps results easy to read and avoids a Pushover caveat: when multiple users are sent in a single request, Pushover ignores the `device` parameter. In this POC, device targeting is only included when exactly one user key is configured.

When `PUSHOVER_GROUP_KEY` is set, `PUSHOVER_DEVICES` is intentionally not sent. For normal delivery groups, Pushover uses the group membership/device settings configured inside the group.

Do not use `.env` as the long-term place for all users. It is only convenient for a local POC.

Pushover gives you three production options:

1. **Store user keys in your own database** — best for ecommerce customer notifications like order updates, cart reminders, or shipment events. Save the customer's Pushover key on their account and send per user when an event happens.
2. **Subscription API** — best for customer opt-in. Pushover redirects the customer back to your site with a `pushover_user_key`, which you store against the logged-in customer. This avoids asking users to manually copy/paste keys.
3. **Delivery Group** — best for broadcasting the same message to many users, such as internal staff alerts or announcement-style notifications. You send to one group key instead of every user key.

For an ecommerce app, prefer the Subscription API plus database storage. Use Delivery Groups only when everyone should receive the same notification.

For production, prefer one of these shapes:

- one customer user key per ecommerce customer profile
- a Pushover group key for an internal operations/support group
- a database table of user keys and device preferences, then send per recipient so each customer can have different targeting

## Notes for the real ecommerce integration

- store each customer's Pushover user/group key only on the server
- validate user/group keys with Pushover's validation API before saving them
- trigger `/api/send` from actual events like abandoned cart, order shipped, or price drop
- keep normal ecommerce messages at priority `0`; reserve priority `1` or `2` for genuinely urgent cases
- handle Pushover `4xx` errors as non-retryable configuration/input problems and retry `5xx` responses no sooner than 5 seconds later
