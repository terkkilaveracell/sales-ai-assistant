import { Request, Response } from "express";
import { askGoogle } from "../services/googleService";
import { isUrlAllowed } from "../modules/scraper";

export async function companyGoogleSearch(req: Request, res: Response) {
  try {
    const companyName = req.query.companyName as string;

    if (!companyName) {
      return res
        .status(400)
        .json({ error: "companyName query parameter is required" });
    }

    // NOTE: We assume the company is Finnish, and therefore all content we search for is in Finnish.

    const googleSearchQueries = [
      `${companyName}`,
      `${companyName} tekoäly`,
      `${companyName} teknologia`,
      `${companyName} data`,
      `${companyName} tulevaisuus`,
    ];

    const googleSearchResultsGrouped = await Promise.all(
      googleSearchQueries.map(async (googleSearchQuery) => {
        const googleSearchResults = await askGoogle(googleSearchQuery);
        return {
          google_search_query: googleSearchQuery,
          google_search_results: googleSearchResults,
        };
      })
    );

    const googleSearchResultsFlat = googleSearchResultsGrouped.flatMap(
      ({ google_search_query, google_search_results }) =>
        google_search_results.map((google_search_result) => ({
          google_search_query,
          google_search_result,
        }))
    );

    const googleSearchResultsFiltered = googleSearchResultsFlat.filter((el) =>
      isUrlAllowed(el.google_search_result.link)
    );

    res.json(googleSearchResultsFiltered);
  } catch (error) {
    console.error("Error in companyGgoogleSearch controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
