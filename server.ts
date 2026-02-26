import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let db: any;
try {
  db = new Database("checklist.db");
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
} catch (err) {
  console.error("Failed to initialize database:", err);
  // Fallback to in-memory or mock if needed, but for now just log
}

async function startServer() {
  console.log("Starting server... NODE_ENV:", process.env.NODE_ENV);
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/ping", (req, res) => res.send("pong"));

  // API Routes
  app.post("/api/submissions", (req, res) => {
    if (!db) return res.status(503).json({ error: "Database not available" });
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
    if (!db) return res.json([]);
    try {
      const submissions = db.prepare("SELECT * FROM submissions ORDER BY created_at DESC").all();
      res.json(submissions.map((s: any) => ({ ...s, data: JSON.parse(s.data as string) })));
    } catch (error) {
      console.error(error);
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
