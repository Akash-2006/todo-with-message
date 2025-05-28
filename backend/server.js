const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const schedule = require("node-schedule");
const axios = require("axios");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(bodyParser.json());

const TELEGRAM_BOT_TOKEN = "7513282696:AAFYnTRrUm3d4BRRMi8HCLTeLg4qGojdRQk";
const TELEGRAM_CHAT_ID = "1914892126";

const db = new Database("tasks.db");

// Create table if it doesn't exist
db.prepare(`
  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    time TEXT NOT NULL
  )
`).run();

// Send Telegram message
function sendTelegramMessage(text) {
  const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
  return axios.post(url, {
    chat_id: TELEGRAM_CHAT_ID,
    text,
  });
}

// Schedule all saved tasks
function scheduleAllTasks() {
  const tasks = db.prepare("SELECT * FROM tasks").all();
  tasks.forEach(task => {
    const taskTime = new Date(task.time);
    if (taskTime > new Date()) {
      schedule.scheduleJob(taskTime, () => {
        sendTelegramMessage(`⏰ Reminder: ${task.text}`);
      });
    }
  });
}

scheduleAllTasks();

// Add task
app.post("/add-task", (req, res) => {
  const { text, time } = req.body;
  const taskTime = new Date(time);
  if (isNaN(taskTime)) {
    return res.status(400).json({ success: false, message: "Invalid time format" });
  }

  try {
    const result = db.prepare("INSERT INTO tasks (text, time) VALUES (?, ?)").run(text, time);
    const task = { id: result.lastInsertRowid, text, time };

    schedule.scheduleJob(taskTime, () => {
      sendTelegramMessage(`⏰ Reminder: ${text}`);
    });

    res.json({ success: true, message: "Task added!", task });
  } catch (err) {
    console.error("DB insert error:", err);
    res.status(500).json({ success: false, message: "Failed to add task." });
  }
});

// Get all tasks
app.get("/tasks", (req, res) => {
  try {
    const tasks = db.prepare("SELECT * FROM tasks ORDER BY time ASC").all();
    res.json({ success: true, tasks });
  } catch (err) {
    console.error("DB fetch error:", err);
    res.status(500).json({ success: false, message: "Failed to load tasks." });
  }
});

// Delete a task
app.delete("/tasks/:id", (req, res) => {
  try {
    const result = db.prepare("DELETE FROM tasks WHERE id = ?").run(req.params.id);
    if (result.changes === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }
    res.json({ success: true, message: "Task deleted." });
  } catch (err) {
    console.error("DB delete error:", err);
    res.status(500).json({ success: false, message: "Failed to delete task." });
  }
});

// Start server
app.listen(3000, () => console.log("✅ Backend running with SQLite DB at http://localhost:3000"));
