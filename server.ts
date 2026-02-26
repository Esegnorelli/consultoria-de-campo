import express from "express";
import { createServer as createViteServer } from "vite";
import { createClient } from "@supabase/supabase-js";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.SUPABASE_URL || "https://zncxgpcqubsqrfqxmhhx.supabase.co";
const supabaseKey = process.env.SUPABASE_ANON_KEY || "sb_publishable_O4Ozf7bprRosDluP37mAiA_ShAlr-m0";
const supabase = createClient(supabaseUrl, supabaseKey);

async function startServer() {
  console.log("Starting server with Supabase integration...");
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/ping", (req, res) => res.send("pong"));

  // API Routes
  app.post("/api/submissions", async (req, res) => {
    const { unit_name, inspector_name, date, score, data } = req.body;
    try {
      const { data: insertedData, error } = await supabase
        .from('submissions')
        .insert([
          { 
            unit_name, 
            inspector_name, 
            date, 
            score, 
            data // Supabase handles JSON objects automatically if column is jsonb
          }
        ])
        .select();

      if (error) throw error;
      res.json({ id: insertedData[0].id });
    } catch (error: any) {
      console.error("Supabase Save Error:", error.message);
      res.status(500).json({ error: "Failed to save submission to Supabase" });
    }
  });

  app.get("/api/submissions", async (req, res) => {
    try {
      const { data: submissions, error } = await supabase
        .from('submissions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      res.json(submissions);
    } catch (error: any) {
      console.error("Supabase Fetch Error:", error.message);
      res.status(500).json({ error: "Failed to fetch submissions from Supabase" });
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
