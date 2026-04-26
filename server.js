const path = require("node:path");

const dotenv = require("dotenv");
const express = require("express");

dotenv.config();

const app = express();
const port = Number(process.env.PORT) || 3000;
const pushoverToken = process.env.PUSHOVER_APP_TOKEN;
const pushoverGroupKey = process.env.PUSHOVER_GROUP_KEY;
const pushoverRecipients = parseCsv(
  pushoverGroupKey || process.env.PUSHOVER_RECIPIENT_KEYS || process.env.PUSHOVER_USER_KEYS,
);
const pushoverDevices = parseCsv(process.env.PUSHOVER_DEVICES || process.env.PUSHOVER_DEVICE);

const pushoverMessagesUrl = "https://api.pushover.net/1/messages.json";

function parseCsv(value) {
  return (value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPushoverBody(requestBody, user) {
  const shouldTargetDevices = !pushoverGroupKey && pushoverRecipients.length === 1 && pushoverDevices.length > 0;
  const payload = {
    token: pushoverToken,
    user,
    title: requestBody?.title || "Pushover POC",
    message: requestBody?.message || "Your Pushover proof of concept is working.",
    priority: requestBody?.priority || "0",
    sound: requestBody?.sound || undefined,
    url: requestBody?.url || undefined,
    url_title: requestBody?.urlTitle || undefined,
    device: shouldTargetDevices ? pushoverDevices.join(",") : undefined,
  };

  const body = new URLSearchParams();

  for (const [key, value] of Object.entries(payload)) {
    if (value) {
      body.set(key, value);
    }
  }

  return body;
}

async function sendPushoverMessage(requestBody, user) {
  const pushoverResponse = await fetch(pushoverMessagesUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: buildPushoverBody(requestBody, user),
  });
  const result = await pushoverResponse.json();

  return {
    ok: pushoverResponse.ok && result.status === 1,
    httpStatus: pushoverResponse.status,
    user,
    request: result.request,
    errors: result.errors || [],
  };
}

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/api/config", (_request, response) => {
  response.json({
    configured: Boolean(pushoverToken && pushoverRecipients.length > 0),
    mode: pushoverGroupKey ? "group" : "recipients",
    recipientCount: pushoverRecipients.length,
    deviceCount: pushoverDevices.length,
  });
});

app.post("/api/send", async (request, response) => {
  if (!pushoverToken || pushoverRecipients.length === 0) {
    response.status(400).json({
      ok: false,
      error: "Missing PUSHOVER_APP_TOKEN or PUSHOVER_GROUP_KEY in .env.",
    });
    return;
  }

  try {
    const results = [];

    for (const recipient of pushoverRecipients) {
      results.push(await sendPushoverMessage(request.body, recipient));
    }

    const failures = results.filter((result) => !result.ok);

    response.status(failures.length > 0 ? 207 : 200).json({
      ok: failures.length === 0,
      sent: results.length - failures.length,
      failed: failures.length,
      results,
    });
  } catch (error) {
    response.status(502).json({
      ok: false,
      errors: [error.message || "Unable to reach the Pushover API."],
    });
  }
});

app.listen(port, () => {
  console.log(`Pushover POC running at http://localhost:${port}`);
});
