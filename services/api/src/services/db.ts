import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";

// Function to generate a new UUID
const generateUUID = (): string => {
  return uuidv4();
};

const pool = new Pool({
  user: process.env["POSTGRES_USER"],
  host: process.env["POSTGRES_HOST"],
  database: process.env["POSTGRES_DB"],
  password: process.env["POSTGRES_PASSWORD"],
  port: parseInt(process.env["POSTGRES_PORT"] || "5432", 10),
});

// Function to execute a query
export const query = (text: string, params?: any[]) => {
  return pool.query(text, params);
};

// Function to upsert a page summary
export const upsertPageSummary = async (
  pageUrl: string,
  pageSummary: string
) => {
  const pageId = generateUUID();

  const sql = `
      INSERT INTO page_summaries (page_id, page_url, page_summary)
      VALUES ($1, $2, $3)
      ON CONFLICT (page_url)
      DO UPDATE SET
        page_url = EXCLUDED.page_url,
        page_summary = EXCLUDED.page_summary;
    `;

  try {
    await query(sql, [pageId, pageUrl, pageSummary]);
  } catch (error) {
    console.error("Error upserting page summary:", error);
  }
};
