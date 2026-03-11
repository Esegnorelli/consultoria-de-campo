import express from "express";
import { createServer as createViteServer } from "vite";
import { Pool } from "pg";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || process.env.POSTGRES_URL,
  // Alternativa: variáveis separadas
  host: process.env.PG_HOST || 'localhost',
  port: parseInt(process.env.PG_PORT || '5432'),
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
  database: process.env.PG_DATABASE || 'consultoria_campo',
});

// Criar tabela se não existir
async function initDatabase() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS submissions (
        id SERIAL PRIMARY KEY,
        unit_name VARCHAR(255) NOT NULL,
        inspector_name VARCHAR(255) NOT NULL,
        date VARCHAR(50) NOT NULL,
        score INTEGER DEFAULT 0,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Tabela 'submissions' verificada/criada");
  } finally {
    client.release();
  }
}

async function startServer() {
  console.log("Starting server with PostgreSQL integration...");

  // Inicializar banco de dados
  await initDatabase();

  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '50mb' }));

  app.get("/ping", (req, res) => res.send("pong"));

  // API Routes

  // Criar nova submissão
  app.post("/api/submissions", async (req, res) => {
    const { unit_name, inspector_name, date, score, data } = req.body;

    try {
      const result = await pool.query(
        `INSERT INTO submissions (unit_name, inspector_name, date, score, data)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [unit_name, inspector_name, date, score || 0, JSON.stringify(data)]
      );

      res.json({ id: result.rows[0].id });
    } catch (error: any) {
      console.error("PostgreSQL Save Error:", error.message);
      res.status(500).json({ error: "Failed to save submission to PostgreSQL" });
    }
  });

  // Listar todas as submissões
  app.get("/api/submissions", async (req, res) => {
    try {
      const result = await pool.query(
        `SELECT id, unit_name, inspector_name, date, score, data, created_at, updated_at
         FROM submissions
         ORDER BY created_at DESC`
      );

      res.json(result.rows);
    } catch (error: any) {
      console.error("PostgreSQL Fetch Error:", error.message);
      res.status(500).json({ error: "Failed to fetch submissions from PostgreSQL" });
    }
  });

  // Buscar uma submissão por ID
  app.get("/api/submissions/:id", async (req, res) => {
    const { id } = req.params;

    try {
      const result = await pool.query(
        `SELECT id, unit_name, inspector_name, date, score, data, created_at, updated_at
         FROM submissions
         WHERE id = $1`,
        [id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Submission not found" });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("PostgreSQL Fetch Error:", error.message);
      res.status(500).json({ error: "Failed to fetch submission from PostgreSQL" });
    }
  });

  // Atualizar submissão
  app.put("/api/submissions/:id", async (req, res) => {
    const { id } = req.params;
    const { unit_name, inspector_name, date, score, data } = req.body;

    try {
      const result = await pool.query(
        `UPDATE submissions
         SET unit_name = COALESCE($1, unit_name),
             inspector_name = COALESCE($2, inspector_name),
             date = COALESCE($3, date),
             score = COALESCE($4, score),
             data = COALESCE($5, data),
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $6
         RETURNING *`,
        [unit_name, inspector_name, date, score, data ? JSON.stringify(data) : null, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: "Submission not found" });
      }

      res.json(result.rows[0]);
    } catch (error: any) {
      console.error("PostgreSQL Update Error:", error.message);
      res.status(500).json({ error: "Failed to update submission in PostgreSQL" });
    }
  });

  // Excluir submissão
  app.delete("/api/submissions/:id", async (req, res) => {
    const { id } = req.params;

    try {
      // Verificar se existe
      const checkResult = await pool.query(
        `SELECT id, unit_name FROM submissions WHERE id = $1`,
        [id]
      );

      if (checkResult.rows.length === 0) {
        return res.status(404).json({ error: "Submission not found" });
      }

      console.log(`🗑️ [DELETE] Registro encontrado: ${checkResult.rows[0].unit_name}`);

      // Excluir
      await pool.query(`DELETE FROM submissions WHERE id = $1`, [id]);

      // Verificar se foi excluído
      const verifyResult = await pool.query(
        `SELECT id FROM submissions WHERE id = $1`,
        [id]
      );

      if (verifyResult.rows.length > 0) {
        throw new Error("Registro não foi excluído");
      }

      console.log(`✅ [DELETE] Registro excluído com sucesso!`);
      res.json({ success: true, message: "Registro excluído com sucesso" });
    } catch (error: any) {
      console.error("PostgreSQL Delete Error:", error.message);
      res.status(500).json({ error: "Failed to delete submission from PostgreSQL" });
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

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
