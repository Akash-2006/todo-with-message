const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const schedule = require("node-schedule");
const axios = require("axios");
const sqlite3 = require("sqlite3").verbose();

const app = express();
app.use(cors());
app.use(bodyParser.json());

const TELEGRAM_BOT_TOKEN = "7513282696:AAFYnTRrUm3d4BRRMi8HCLTeLg4qGojdRQk";
const TELEGRAM_CHAT_ID = "1914892126";

const db = new sqlite3.Database("./tasks.db", (err) => {
  if (err) {
    console.error("Failed to connect to DB:", err);
  } else {
    db.run(`
      CREATE TABLE IF NOT EXISTS tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        text TEXT NOT NULL,
        time TEXT NOT NULL
      )
    `);
  }
});

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
  db.all("SELECT * FROM tasks", (err, tasks) => {
    if (err) {
      console.error("DB fetch error:", err);
    } else {
      tasks.forEach(task => {
        const taskTime = new Date(task.time);
        if (taskTime > new Date()) {
          schedule.scheduleJob(taskTime, () => {
            sendTelegramMessage(`⏰ Reminder: ${task.text}`);
          });
        }
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

  const stmt = db.prepare("INSERT INTO tasks (text, time) VALUES (?, ?)");
  stmt.run(text, time, function (err) {
    if (err) {
      console.error("DB insert error:", err);
      return res.status(500).json({ success: false, message: "Failed to add task." });
    }
    const task = { id: this.lastID, text, time };
    schedule.scheduleJob(taskTime, () => {
      sendTelegramMessage(`⏰ Reminder: ${text}`);
    });
    res.json({ success: true, message: "Task added!", task });
  });
});

// Get all tasks
app.get("/tasks", (req, res) => {
  db.all("SELECT * FROM tasks ORDER BY time ASC", (err, tasks) => {
    if (err) {
      console.error("DB fetch error:", err);
      return res.status(500).json({ success: false, message: "Failed to load tasks." });
    }
    res.json({ success: true, tasks });
  });
});

// Delete a task
app.delete("/tasks/:id", (req, res) => {
  db.run("DELETE FROM tasks WHERE id = ?", req.params.id, function (err) {
    if (err) {
      console.error("DB delete error:", err);
      return res.status(500).json({ success: false, message: "Failed to delete task." });
    }
    if (this.changes === 0) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }
    res.json({ success: true, message: "Task deleted." });
  });
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`✅ Backend running with SQLite DB on port ${PORT}`));
