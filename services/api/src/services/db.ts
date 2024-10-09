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

// Function to check if a company exists and insert if it doesn't
export const findOrCreateCompany = async (
  companyName: string,
  companyUrl: string
): Promise<string> => {
  try {
    // Check if the company already exists
    const result = await query(
      "SELECT company_id FROM companies WHERE company_name = $1",
      [companyName]
    );

    if (result.rows.length > 0) {
      // Company exists, return the company_id
      return result.rows[0].company_id;
    } else {
      // Company does not exist, insert a new row
      const newCompanyId = uuidv4(); // Generate a new UUID for the company_id
      const insertResult = await query(
        "INSERT INTO companies (company_id, company_name) VALUES ($1, $2) RETURNING company_id",
        [newCompanyId, companyName]
      );
      // Return the newly created company_id
      return insertResult.rows[0].company_id;
    }
  } catch (error) {
    console.error("Error in findOrCreateCompany:", error);
    throw error; // Handle error appropriately
  } finally {
    //client.release(); // Release the client back to the pool
  }
};
