const intervalMs = Number(process.env.TICK_MS ?? 1000);
let tick = 0;

const timer = setInterval(() => {
  tick++;
  console.log(`[fake-worker] tick=${tick} processed=0 pending=0`);
}, intervalMs);

process.on("SIGINT", () => {
  clearInterval(timer);
  console.log("[fake-worker] shutdown");
  process.exit(0);
});
