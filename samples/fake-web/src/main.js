const apiUrl = window.__API_URL__ ?? "http://localhost:3000";

const $name = document.getElementById("name");
const $submit = document.getElementById("submit");
const $status = document.getElementById("status");
const $log = document.getElementById("log");

function setStatus(text, kind) {
  $status.textContent = text;
  $status.className = `status ${kind}`;
}

function appendLog(line) {
  $log.textContent += (line + "\n");
}

async function submit() {
  const name = $name.value.trim();
  if (!name) {
    setStatus("enter a name first", "err");
    return;
  }

  $submit.disabled = true;
  $log.textContent = "";
  setStatus("posting to api…", "pending");

  let taskId;
  try {
    const res = await fetch(`${apiUrl}/greet`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) throw new Error(`api returned ${res.status}`);
    const data = await res.json();
    taskId = data.taskId;
  } catch (err) {
    setStatus(`api unreachable: ${err.message}`, "err");
    $submit.disabled = false;
    return;
  }

  appendLog(`POST /greet → taskId=${taskId}`);
  setStatus("enqueued — worker will pick it up…", "pending");

  const started = Date.now();
  const interval = setInterval(async () => {
    try {
      const res = await fetch(`${apiUrl}/tasks/${taskId}`);
      if (!res.ok) return;
      const task = await res.json();
      if (task.status === "done") {
        clearInterval(interval);
        const elapsed = Date.now() - started;
        appendLog(`GET /tasks/${taskId} → ${task.status}`);
        appendLog(`\n${task.result}\n`);
        setStatus(`done in ${elapsed}ms`, "done");
        $submit.disabled = false;
      }
    } catch {
      // keep polling
    }
  }, 400);
}

$submit.addEventListener("click", submit);
$name.addEventListener("keydown", (e) => {
  if (e.key === "Enter") submit();
});
