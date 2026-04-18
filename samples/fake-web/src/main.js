const apiUrl = window.__API_URL__ ?? "http://localhost:3000";

async function checkHealth() {
  const el = document.getElementById("status");
  if (!el) return;
  try {
    const res = await fetch(`${apiUrl}/health`);
    const data = await res.json();
    el.textContent = `api: ${data.status}`;
  } catch (err) {
    el.textContent = `api unreachable: ${err.message}`;
  }
}

checkHealth();
