function showAlert(message, type = "info") {
  const colors = {
    success: "#2e7d32",
    error: "#c62828",
    info: "#1565c0",
  };

  Toastify({
    text: message,
    duration: 3000,
    close: true,
    gravity: "top",
    position: "right",
    backgroundColor: colors[type] || colors.info,
  }).showToast();
}

// ------------------------------------------------------------
// LISTEN FOR EVENTS FROM THE MCP SERVER
// ------------------------------------------------------------
const events = new EventSource("http://localhost:3001/events");

events.onmessage = function (e) {
  try {
    const data = JSON.parse(e.data);
    if (data.type === "start") {
      showAlert(`Timer started: ${data.taskName}`, "success");
    } else if (data.type === "stop") {
      showAlert(`Timer stopped: ${data.taskName} — ${data.formatted}`, "info");
    }
  } catch {
    // Malformed payload — ignore
  }
};

events.onerror = function () {
  // Server not running — toasts from buttons still work
};

// ------------------------------------------------------------
// MANUAL BUTTONS (for testing without Claude)
// ------------------------------------------------------------
document.getElementById("btn-start").addEventListener("click", function () {
  const task = document.getElementById("task-name").value.trim();
  if (!task) {
    showAlert("Enter a task name first", "error");
    return;
  }
  showAlert(`Timer started: ${task}`, "success");
});

document.getElementById("btn-stop").addEventListener("click", function () {
  const task = document.getElementById("task-name").value.trim();
  if (!task) {
    showAlert("Enter a task name first", "error");
    return;
  }
  showAlert(`Timer stopped: ${task}`, "info");
});
