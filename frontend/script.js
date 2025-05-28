const form = document.getElementById("todo-form");
const messageDiv = document.getElementById("message");
const taskList = document.getElementById("task-list");

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const text = document.getElementById("task").value;
  const time = document.getElementById("time").value;

  try {
    const res = await fetch("http://localhost:3000/add-task", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text, time }),
    });

    const data = await res.json();
    messageDiv.textContent = data.message;
    form.reset();
    loadTasks(); // Refresh list
  } catch (err) {
    console.error("Error adding task:", err);
    messageDiv.textContent = "Failed to add task.";
  }
});

async function loadTasks() {
  try {
    const res = await fetch("http://localhost:3000/tasks");
    const data = await res.json();
    taskList.innerHTML = "";

    if (data.tasks.length === 0) {
      taskList.innerHTML = "<li>No tasks found.</li>";
      return;
    }

    data.tasks.forEach((task) => {
      const li = document.createElement("li");
      li.textContent = `${task.text} - ${new Date(task.time).toLocaleString()}`;
      const delBtn = document.createElement("button");
      delBtn.textContent = "❌";
      delBtn.onclick = () => deleteTask(task.id);
      li.appendChild(delBtn);
      taskList.appendChild(li);
    });
  } catch (err) {
    console.error("Error loading tasks:", err);
  }
}

async function deleteTask(id) {
  try {
    await fetch(`http://localhost:3000/tasks/${id}`, {
      method: "DELETE",
    });
    loadTasks(); // Refresh list
  } catch (err) {
    console.error("Error deleting task:", err);
  }
}

// Load on page load
loadTasks();
