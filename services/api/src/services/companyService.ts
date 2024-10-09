import Queue from "bull";
import {
  isUrlAllowed,
  getBaseUrl,
  getAllowedSitemapUrlsFromBaseUrl,
  scrapeAndChunkUrls,
} from "../modules/scraper";
import { CompanyDomainName } from "../schemas";
import { databaseService as db } from "../services/databaseService";
import { askGoogle, GoogleSearchResultItem } from "../services/googleService";
import { openaiService as openai } from "../services/openaiService";
import { logMethod } from "../utils/logDecorator";
import { logger } from "../utils/logger";

interface GoogleSearchQueryAndResultItem {
  google_search_query: string;
  google_search_result: GoogleSearchResultItem;
}

const makeCompanyGoogleSearchQueries = (companyName: string): string[] => {
  // NOTE: We assume the company is Finnish, and therefore all content we search for is in Finnish.

  const googleSearchQueries = [
    `${companyName}`,
    //`${companyName} tekoäly`,
    //`${companyName} teknologia`,
    //`${companyName} data`,
    //`${companyName} rahoitus`,
    //`${companyName} tulevaisuus`,
  ];

  return googleSearchQueries;
};

const identifyLikeliestCompanyDomainName = async (
  companyName: string
): Promise<string> => {
  const googleSearchResults = await makeGoogleSearchByCompanyName(companyName);

  const domainNames = googleSearchResults.map((result) =>
    getBaseUrl(result.google_search_result.link)
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

  const query = `
      I have a list of domain names that is a result of series of google queries. Among the domain names should be the company home page. 
      The company is ${companyName}. Please identify the likeliest company domain name from the list of domain names. 
      I have counted the number of times each domain name appears in google search results. 
      Choose one from the list as it is written, based on your judgement.
  
      Domain names along with the number of times encountered in google searches:
      ${JSON.stringify(domainNameCounts)}
      `;

  const likeliestCompanyDomainName = (
    await openai.askStructured<CompanyDomainName>(query, "CompanyDomainName")
  ).company_domain_name;

  logger.info(
    `Likeliest company domain name for ${companyName} is: ${likeliestCompanyDomainName}`
  );

  return likeliestCompanyDomainName;
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

const companyInformationGatheringQueue = new Queue(
  "company-information-gathering-queue",
  {
    redis: {
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT as string),
    },
  }
);

companyInformationGatheringQueue.on("completed", (job, result) => {
  logger.info(`Job completed with ID: ${job.id}, result:`, result);
});

companyInformationGatheringQueue.on("failed", (job, err) => {
  logger.error(`Job failed with ID: ${job.id}`, err);
});

companyInformationGatheringQueue.on("active", (job) => {
  logger.info(`Job is now active with ID: ${job.id}`);
});

companyInformationGatheringQueue.on("stalled", (job) => {
  logger.error(`Job stalled with ID: ${job.id}`);
});

companyInformationGatheringQueue.process(async (job) => {
  const likeliestCompanyDomainName = await identifyLikeliestCompanyDomainName(
    job.data.companyName
  );

  const companyId = db.findOrCreateCompany(
    job.data.companyName,
    likeliestCompanyDomainName
  );

  const allowedSitemapUrls = await getAllowedSitemapUrlsFromBaseUrl(
    likeliestCompanyDomainName
  );

  const chunkSize = null;
  const numRetries = 3;

  // Chunks are full web pages
  const chunks = await scrapeAndChunkUrls(
    [likeliestCompanyDomainName, ...allowedSitemapUrls],
    chunkSize,
    numRetries
  );

  console.log(JSON.stringify(chunks));

  //chunks.forEach((chunk) => {
  const query = `
  I want you to summarise the contents of the following text that is a full scrape of the textual content of the website.
  Provide your summary based on only the content what is provided, do not add anything you don't find there.
  Provide your summary in no more than 100 words, and stick to plaintext. Paragraphs allowed, but use sparingly.

  <scraped_content>
  ${chunks[0].text}
  </scraped_content>

  `;

  const pageSummary = await openai.ask(query);

  db.upsertPageSummary(chunks[0].url, pageSummary);
  //});
});

class CompanyService {
  @logMethod()
  gatherCompanyInformationInBackground(companyName: string): void {
    companyInformationGatheringQueue.add({ companyName });
  }
}

// Function to fetch company data
export const companyService = new CompanyService();
