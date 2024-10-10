import { Pool } from "pg";
import { v4 as uuidv4 } from "uuid";
import { logMethod } from "../utils/logDecorator";
import { AzureOpenAIModel, estimateCost } from "../utils/costEstimator";
import { handleErrors } from "../utils/errorDecorator";

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

class DatabaseService {
  // Function to execute a query
  @logMethod()
  query(text: string, params?: any[]) {
    return pool.query(text, params);
  }

  // Function to upsert a page summary
  @logMethod()
  async upsertPageSummary(pageUrl: string, pageSummary: string) {
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
      await this.query(sql, [pageId, pageUrl, pageSummary]);
    } catch (error) {
      console.error("Error upserting page summary:", error);
    }
  }

  // Function to check if a company exists and insert if it doesn't
  @logMethod()
  @handleErrors()
  async upsertCompanyDetails(
    companyName: string,
    companyUrl: string
  ): Promise<string> {
    const sql = `
        INSERT INTO 
          companies (company_id, company_name, company_url)
        VALUES 
          ($1, $2, $3)
        ON CONFLICT 
          (company_name) 
        DO UPDATE SET 
          company_url = EXCLUDED.company_url
        RETURNING
          company_id
        ;`;
    const newCompanyId = generateUUID();
    const insertResult = await this.query(sql, [
      newCompanyId,
      companyName,
      companyUrl,
    ]);
    return insertResult.rows[0].company_id;
  }

  @logMethod()
  @handleErrors()
  async accumulateDailyTotalCost(cost: number) {
    const sql = `
    INSERT INTO
      openai_api_daily_costs (date, cost)
    VALUES
      (CURRENT_DATE, $1)
    ON CONFLICT
      (day)
    DO UPDATE SET
      cost = your_table.cost + $1
    ;`;
    const insertResult = await this.query(sql, [cost]);
  }
}

export const databaseService = new DatabaseService();
