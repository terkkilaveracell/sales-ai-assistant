import axios, { AxiosInstance } from "axios";
import { parseString } from "xml2js";
import robotsParser, { Robot } from "robots-parser";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HtmlToTextTransformer } from "langchain/document_transformers/html_to_text";
import { askGoogle } from "./google";
import Bottleneck from "bottleneck";

const limiter = new Bottleneck({
  maxConcurrent: 5,
});

export interface Chunk {
  url: string;
  text: string;
  index: number;
}

const containsAnySubstring = (input: string, substrings: string[]): boolean => {
  return substrings.some((sub) => new RegExp(sub, "i").test(input));
};

export const isCompanyUrlCandidate = (url: string) =>
  !containsAnySubstring(url, [
    "linkedin",
    "facebook",
    "apple",
    "google",
    "instagram",
    "zendesk",
    "stackoverflow",
    "amazon",
    "microsoft",
    "wikipedia",
    "reddit",
    "twitter",
    "finder",
  ]);

const endsWithAny = (str: string, substrings: string[]): boolean => {
  return substrings.some((substring) => str.endsWith(substring));
};

const getBaseUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  } catch (error) {
    console.error("Invalid URL:", error);
    return "";
  }
};

export const identifyLikeliesCompanyUrl = async (
  companyName: string
): Promise<string> => {
  const searchResults = await askGoogle(companyName);

  const companyWebsiteCandidates = searchResults
    .map((el) => ({ url: el.link, snippet: el.snippet }))
    .filter((el) => isCompanyUrlCandidate(el.url))
    .map((el) => ({ url: getBaseUrl(el.url), snippet: el.snippet }))
    .filter((el) => endsWithAny(el.url, [".fi", ".com"]));

  console.log(searchResults.map((hit) => hit.link));
  console.log(companyWebsiteCandidates);

  return companyWebsiteCandidates[0].url;
};

export const identifyLikeliesCompanyFonectaFinderUrl = async (
  companyName: string
): Promise<string> => {
  const searchResults = await askGoogle(`${companyName} finder`);

  const websiteCandidates = searchResults
    .map((el) => ({ url: el.link, snippet: el.snippet }))
    .filter((el) => el.url.indexOf("finder.fi") !== -1);

  console.log(websiteCandidates);

  return websiteCandidates[0].url;
};

export const scrapeWebsite = async (
  url: string,
  chunkSize: number = 500,
  chunkOverlap: number = 100
): Promise<Chunk[]> => {
  const loader = new CheerioWebBaseLoader(url);

  const docs = await loader.load();

  const transformer = new HtmlToTextTransformer();

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("html", {
    chunkSize: chunkSize,
    chunkOverlap: chunkOverlap,
  });

  const sequence = splitter.pipe(transformer);

  const newDocuments = await sequence.invoke(docs);

  return newDocuments.map(
    (doc, index) =>
      ({
        url,
        index,
        text: doc.pageContent,
      } as Chunk)
  );
};

export const scrapeWebsiteWithRetries = async (
  url: string,
  chunkSize: number = 500,
  chunkOverlap: number = 100,
  retries: number = 3
): Promise<Chunk[]> => {
  for (let i = 0; i < retries; i++) {
    try {
      return await scrapeWebsite(url, chunkSize, chunkOverlap);
    } catch (error) {
      if (error instanceof DOMException) {
        console.log(`Attempt ${i + 1} failed with DOMException. Retrying...`);
        continue; // Retry if it's a DOMException
      } else {
        console.log(
          "Scraping attempt failed with unhandled exception. Giving up..."
        );
        return [];
      }
      throw error; // Rethrow if it's a different kind of error
    }
  }
  console.log(`All scraping attempts (${retries}) failed. Giving up...`);
  return [];
};

function ensureHttps(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url;
}

const getRobot = async (url: string): Promise<Robot> => {
  const robotsUrl = new URL("robots.txt", ensureHttps(url)).href;

  console.log(`Guessing robot file location: ${robotsUrl}`);

  const response = await axios.get(robotsUrl, { responseType: "text" });

  const robotsTxt = response.data;

  const robot = robotsParser(url, robotsTxt);

  return robot;
};

async function fetchAndParseSitemap(url: string): Promise<string[]> {
  try {
    const response = await axios.get(url);
    return new Promise((resolve, reject) => {
      parseString(response.data, (err, result) => {
        if (err) {
          reject(err);
        } else {
          if (result.sitemapindex) {
            // It's a sitemap index
            const sitemaps = result.sitemapindex.sitemap.map(
              (s: any) => s.loc as string
            );
            resolve(processSitemapIndex(sitemaps));
          } else {
            // It's a regular sitemap
            const urls = result.urlset.url.map(
              (urlEntry: any) => urlEntry.loc as string
            );
            resolve(urls);
          }
        }
      });
    });
  } catch (error) {
    console.error("Error fetching the sitemap:", error);
    return [];
  }
}

async function processSitemapIndex(sitemapUrls: string[]): Promise<string[]> {
  const allUrls: string[] = [];
  for (const sitemapUrl of sitemapUrls) {
    const urls = await fetchAndParseSitemap(sitemapUrl);
    allUrls.push(...urls);
  }
  return allUrls;
}

const getSitemapUrls = async (sitemapUrl: string): Promise<string[]> => {
  const sitemapUrls = await fetchAndParseSitemap(sitemapUrl);

  return sitemapUrls;
};

export const scrapeWebsiteBySitemap = async (
  baseUrl: string,
  chunkSize: number,
  chunkOverlap: number,
  nRetries: number
): Promise<Chunk[]> => {
  const robot = await getRobot(baseUrl);

  console.log("Found the following sitemaps:", robot.getSitemaps());

  const sitemapUrls = await getSitemapUrls(robot.getSitemaps()[0]);

  sitemapUrls.forEach((url) => {
    console.log(
      ` - ${url} (${
        robot.isDisallowed(url, "SalesAIAssistant") ? "PROHIBITED" : "OK"
      })`
    );
  });

  const scrapedContent = (
    await Promise.all(
      [baseUrl, ...sitemapUrls].map((url) =>
        limiter.schedule(() =>
          scrapeWebsiteWithRetries(url, chunkSize, chunkOverlap, nRetries)
        )
      )
    )
  ).reduce((accumulator, value) => accumulator.concat(value), []);

  return scrapedContent;
};
