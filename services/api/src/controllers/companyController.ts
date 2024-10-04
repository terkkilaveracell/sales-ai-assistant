import { Request, Response } from "express";
import { askGoogle, GoogleSearchResultItem } from "../services/googleService";
import { OpenAI } from "../modules/openai";
import { isUrlAllowed } from "../modules/scraper";
import { CompanyDomainName } from "../schemas";

interface GoogleSearchQueryAndResultItem {
  google_search_query: string;
  google_search_result: GoogleSearchResultItem;
}

const makeCompanyGoogleSearchQueries = (companyName: string): string[] => {
  // NOTE: We assume the company is Finnish, and therefore all content we search for is in Finnish.

  const googleSearchQueries = [
    `${companyName}`,
    `${companyName} tekoäly`,
    `${companyName} teknologia`,
    `${companyName} data`,
    `${companyName} rahoitus`,
    `${companyName} tulevaisuus`,
  ];

  return googleSearchQueries;
};

const makeGoogleSearchByCompanyName = async (
  companyName: string
): Promise<GoogleSearchQueryAndResultItem[]> => {
  const googleSearchQueries = makeCompanyGoogleSearchQueries(companyName);

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
      google_search_results.map(
        (google_search_result) =>
          ({
            google_search_query,
            google_search_result,
          } as GoogleSearchQueryAndResultItem)
      )
  );

  const googleSearchResultsFiltered = googleSearchResultsFlat.filter((el) =>
    isUrlAllowed(el.google_search_result.link)
  );

  return googleSearchResultsFiltered;
};

const schema = {
  type: "object",
  properties: {
    order_id: { type: "string" },
  },
  required: ["order_id"],
};

export async function companyGoogleSearch(req: Request, res: Response) {
  try {
    const companyName = req.query.companyName as string;

    if (!companyName) {
      return res
        .status(400)
        .json({ error: "companyName query parameter is required" });
    }

    const googleSearchResults = await makeGoogleSearchByCompanyName(
      companyName
    );

    const domainNames = googleSearchResults.map(
      (result) => new URL(result.google_search_result.link).hostname
    );

    console.log(domainNames);

    const domainNameCounts: { [domainName: string]: number } = {};

    domainNames.forEach((hostname) => {
      if (domainNameCounts[hostname]) {
        domainNameCounts[hostname]++;
      } else {
        domainNameCounts[hostname] = 1;
      }
    });

    console.log(domainNameCounts);

    const openai = new OpenAI();

    console.log(schema);

    const query = `
    I have a list of domain names that is a result of series of google queries. Among the domain names should be the company home page. 
    The company is ${companyName}. Please identify the likeliest company base domain name from the list of domain names.
    I have counted the number of times each domain name appears in google search results.

    Domain names along with the number of times encountered in google searches:
    ${JSON.stringify(domainNameCounts)}
    `;

    console.log(query);

    const likelyCompanyDomainName = (
      await openai.askStructured<CompanyDomainName>(query, "CompanyDomainName")
    ).company_domain_name;

    console.log(likelyCompanyDomainName);

    res.json(googleSearchResults);
  } catch (error) {
    console.error("Error in companyGgoogleSearch controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
