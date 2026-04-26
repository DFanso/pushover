const sendForm = document.querySelector("#sendForm");
const statusElement = document.querySelector("#status");

const setStatus = (message) => {
  statusElement.textContent = message;
};

const initialise = async () => {
  const configResponse = await fetch("/api/config");
  const config = await configResponse.json();

  if (config.configured) {
    const target = config.mode === "group" ? "the configured group" : `${config.recipientCount} recipient(s)`;
    setStatus(`Pushover credentials found for ${target}.`);
  } else {
    setStatus("Add PUSHOVER_APP_TOKEN and PUSHOVER_GROUP_KEY to .env, then restart the server.");
  }
};

const sendTestPush = async (event) => {
  event.preventDefault();

  const formData = new FormData(sendForm);
  const payload = Object.fromEntries(formData.entries());
  const response = await fetch("/api/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const result = await response.json();

  if (!result.ok) {
    const errors = result.results
      ? result.results.flatMap((item) => item.errors)
      : result.errors || [result.error || "Unable to send the notification."];
    setStatus(`Sent ${result.sent || 0}; failed ${result.failed || 1}. ${errors.join(" ")}`);
    return;
  }

  setStatus(`Pushover accepted ${result.sent} notification request(s).`);
};

sendForm.addEventListener("submit", (event) => {
  sendTestPush(event).catch((error) => {
    setStatus(error.message || "Failed to send the Pushover notification.");
  });
});

initialise().catch((error) => {
  setStatus(error.message || "Failed to initialise the Pushover demo.");
});
