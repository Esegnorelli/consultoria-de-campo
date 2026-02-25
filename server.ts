import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("checklist.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS submissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    unit_name TEXT,
    inspector_name TEXT,
    date TEXT,
    score REAL,
    data TEXT, -- JSON string of the checklist results
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  // API Routes
  app.post("/api/submissions", (req, res) => {
    const { unit_name, inspector_name, date, score, data } = req.body;
    try {
      const stmt = db.prepare(
        "INSERT INTO submissions (unit_name, inspector_name, date, score, data) VALUES (?, ?, ?, ?, ?)"
      );
      const result = stmt.run(unit_name, inspector_name, date, score, JSON.stringify(data));
      res.json({ id: result.lastInsertRowid });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save submission" });
    }
  });

  app.get("/api/submissions", (req, res) => {
    try {
      const submissions = db.prepare("SELECT * FROM submissions ORDER BY created_at DESC").all();
      res.json(submissions.map(s => ({ ...s, data: JSON.parse(s.data as string) })));
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch submissions" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
