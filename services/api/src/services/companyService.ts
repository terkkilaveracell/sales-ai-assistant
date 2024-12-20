import Queue from "bull";
import {
  isUrlAllowed,
  getBaseUrl,
  scrapeAndChunkUrls,
} from "../modules/scraper";
import { CompanyContacts, CompanyDomainName } from "../schemas";
import { databaseService as db } from "../services/databaseService";
import { askGoogle, GoogleSearchResultItem } from "../services/googleService";
import { openaiService as openai } from "../services/openaiService";
import { logMethod } from "../utils/logDecorator";
import { logger } from "../utils/logger";
import { Robot } from "../utils/robot";

interface GoogleSearchQueryAndResultItem {
  google_search_query: string;
  google_search_result: GoogleSearchResultItem;
}

interface CompanyRow {
  company_id: string;
  company_name: string;
  company_details: any | null;
  company_url: string;
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
    await openai.makeCompletionStructured<CompanyDomainName>(
      query,
      "CompanyDomainName"
    )
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

  const companyId = await db.upsertCompanyDetails(
    job.data.companyName,
    likeliestCompanyDomainName
  );

  const robot = await Robot.create(likeliestCompanyDomainName);

  logger.info(`Robot: ${JSON.stringify(robot)}`);

  const allowedSitemapUrls = await robot.getSitemapUrlsAllowedByRobotRules();

  logger.info(`Allowed sitemap URLs: ${allowedSitemapUrls}`);

  const chunkSize = null;
  const numRetries = 3;

  // Select pages that have not been scraped yet
  const companyWebsiteUrlsToScrape = allowedSitemapUrls.filter(async (url) => {
    const pageId = await db.getPageIdByUrl(url);
    return pageId === null;
  });

  logger.info(
    `Scraping ${
      companyWebsiteUrlsToScrape.length
    } company URLs: ${JSON.stringify(companyWebsiteUrlsToScrape)}`
  );

  // Chunks are full web pages
  const chunks = await scrapeAndChunkUrls(
    companyWebsiteUrlsToScrape,
    chunkSize,
    numRetries
  );

  await Promise.all(
    chunks.map(async (chunk) => {
      db.upsertWebpageData(companyId, chunk.url, chunk.text);
    })
  );

  //console.log(JSON.stringify(chunks));

  //chunks.forEach((chunk) => {
  /*
  const query = `
  I want you to summarise the contents of the following text that is a full scrape of the textual content of the website.
  Provide your summary based on only the content what is provided, do not add anything you don't find there.
  Provide your summary in no more than 100 words, and stick to plaintext. Paragraphs allowed, but use sparingly.

  <scraped_content>
  ${chunks[0].text}
  </scraped_content>

  `;

  const pageSummary = await openai.makeCompletion(query);

  db.upsertPageSummary(chunks[0].url, pageSummary);
  */

  const chunks2 = await scrapeAndChunkUrls(
    ["https://www.veracell.com/contact"],
    chunkSize,
    numRetries
  );

  const query2 = `
  I want you to find all employee names and contact details such as phone number, email, and role, into a structured content.
  All information should be extracted as they are written in the web page.

  <scraped_content>
  ${chunks2[0].text}
  </scraped_content>
  `;

  const companyContacts =
    await openai.makeCompletionStructured<CompanyContacts>(
      query2,
      "CompanyContacts"
    );

  logger.info(
    `Found company contacts for ${job.data.companyName}: ${JSON.stringify(
      companyContacts,
      null,
      2
    )}`
  );

  //});
});

class CompanyService {
  @logMethod()
  gatherCompanyInformationInBackground(companyName: string): void {
    companyInformationGatheringQueue.add({ companyName });
  }

  @logMethod()
  async getCompanies(): Promise<CompanyRow[]> {
    const query = "SELECT * FROM companies";
    const result = await db.query(query);
    return result.rows;
  }
}

// Function to fetch company data
export const companyService = new CompanyService();
