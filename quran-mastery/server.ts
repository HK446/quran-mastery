import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("mastery.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS attempts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ayah_key TEXT,
    question_type TEXT,
    page_13line INTEGER,
    juz_number INTEGER,
    ruku_in_juz INTEGER,
    correct BOOLEAN,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/progress", (req, res) => {
    const stats = db.prepare("SELECT * FROM attempts").all();
    res.json(stats);
  });

  app.post("/api/attempt", (req, res) => {
    const { ayah_key, question_type, page_13line, juz_number, ruku_in_juz, correct } = req.body;
    const stmt = db.prepare(`
      INSERT INTO attempts (ayah_key, question_type, page_13line, juz_number, ruku_in_juz, correct)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(ayah_key, question_type, page_13line, juz_number, ruku_in_juz, correct ? 1 : 0);
    res.json({ success: true });
  });

  app.post("/api/reset", (req, res) => {
    db.prepare("DELETE FROM attempts").run();
    res.json({ success: true });
  });

  // Serve the Quran JSON
  app.get("/api/quran", (req, res) => {
    const data = fs.readFileSync(path.join(__dirname, "ayah_full_13line.json"), "utf8");
    res.json(JSON.parse(data));
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
