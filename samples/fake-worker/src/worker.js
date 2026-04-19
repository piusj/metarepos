const apiUrl = process.env.API_URL ?? "http://localhost:3000";
const pollMs = Number(process.env.POLL_MS ?? 1000);

async function processPending() {
  let res;
  try {
    res = await fetch(`${apiUrl}/tasks/pending`);
  } catch (err) {
    return; // API not up yet; try again next tick
  }
  if (!res.ok) return;

  const pending = await res.json();
  for (const task of pending) {
    const ts = new Date().toISOString().slice(11, 19); // HH:MM:SS
    const result = `Hello from worker, ${task.name}! (processed at ${ts} UTC)`;
    console.log(`[fake-worker] processing ${task.id} for "${task.name}"`);
    try {
      await fetch(`${apiUrl}/tasks/${task.id}/result`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ result }),
      });
    } catch (err) {
      console.log(`[fake-worker] failed to post result for ${task.id}: ${err.message}`);
    }
  }
}

console.log(`[fake-worker] polling ${apiUrl}/tasks/pending every ${pollMs}ms`);
const timer = setInterval(processPending, pollMs);

process.on("SIGINT", () => {
  clearInterval(timer);
  console.log("[fake-worker] shutdown");
  process.exit(0);
});
