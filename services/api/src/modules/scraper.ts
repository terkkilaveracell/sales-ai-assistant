import axios, { AxiosInstance } from "axios";
import { parseString } from "xml2js";
import robotsParser, { Robot } from "robots-parser";
import { askGoogle } from "../services/googleService";
import Bottleneck from "bottleneck";
import { logger } from "../utils/logger";

import * as cheerio from "cheerio";

// Function to split text into chunks
export function splitText(text: string, chunkSize: number): string[] {
  const chunks: string[] = [];
  let currentChunk = "";

  const sentences = text.match(/[^\.!\?]+[\.!\?]+/g) || [text];

  for (const sentence of sentences) {
    if ((currentChunk + sentence).length > chunkSize) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
    }
    currentChunk += sentence + " ";
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

// Main function to scrape and chunk content
export async function scrapeAndChunkWebsite(
  url: string,
  chunkSize: number | null
): Promise<Chunk[]> {
  console.log(`Attempting to scrape the page: ${url}`);
  try {
    // Fetch the HTML content from the URL
    const { data: html } = await axios.get(url);

    // Load HTML into Cheerio for parsing
    const $ = cheerio.load(html);

    // Remove script and style tags for cleaner text
    $("script, style, noscript").remove();

    // Extract text content from the body
    const rawText = $("body").text();

    // Normalize whitespace and remove unnecessary line breaks
    const normalizedText = rawText.replace(/\s+/g, " ").trim();

    // Split the text into chunks suitable for RAG
    const splittedText = chunkSize
      ? splitText(normalizedText, chunkSize)
      : [normalizedText];

    return splittedText.map(
      (chunk, index) =>
        ({
          url,
          index,
          text: chunk,
        } as Chunk)
    );
  } catch (error) {
    console.error("Error scraping the URL:", error);
    return [];
  }
}

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

export const isUrlAllowed = (url: string) =>
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
  ]) && endsWithAny(getBaseUrl(url), [".fi", ".com"]);

const endsWithAny = (str: string, substrings: string[]): boolean => {
  return substrings.some((substring) => str.endsWith(substring));
};

export const getBaseUrl = (url: string): string => {
  try {
    const parsedUrl = new URL(url);
    return `${parsedUrl.protocol}//${parsedUrl.hostname}`;
  } catch (error) {
    console.error("Invalid URL:", error);
    return "";
  }
};

export const scrapeAndChunkWebsiteWithRetries = async (
  url: string,
  chunkSize: number | null = 500,
  numRetries: number = 3
): Promise<Chunk[]> => {
  for (let i = 0; i < numRetries; i++) {
    try {
      return await scrapeAndChunkWebsite(url, chunkSize);
    } catch (error) {
      if (error instanceof DOMException) {
        logger.info(`Attempt ${i + 1} failed with DOMException. Retrying...`);
        continue; // Retry if it's a DOMException
      } else {
        logger.info(
          "Scraping attempt failed with unhandled exception. Giving up..."
        );
        return [];
      }
      throw error; // Rethrow if it's a different kind of error
    }
  }
  logger.info(`All scraping attempts (${numRetries}) failed. Giving up...`);
  return [];
};

export const ensureHttps = (url: string): string => {
  if (!url.startsWith("http://") && !url.startsWith("https://")) {
    url = "https://" + url;
  }
  return url;
};

const getRobot = async (url: string): Promise<Robot> => {
  const robotsUrl = new URL("robots.txt", ensureHttps(url)).href;

  logger.info(`Guessing robot file location: ${robotsUrl}`);

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
    logger.error("Error fetching the sitemap:", error);
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

export const getAllowedSitemapUrlsFromBaseUrl = async (
  baseUrl: string
): Promise<string[]> => {
  const robot = await getRobot(baseUrl);

  logger.info("Found the following sitemaps:", robot.getSitemaps());

  const sitemapUrls = await getSitemapUrls(robot.getSitemaps()[0]);

  const allowedSitemapUrls = sitemapUrls.filter(
    (url) => !robot.isDisallowed(url, "SalesAIAssistant")
  );

  return allowedSitemapUrls;
};

export const scrapeAndChunkUrls = async (
  urls: string[],
  chunkSize: number | null,
  nRetries: number
): Promise<Chunk[]> => {
  //const robot = await getRobot(baseUrl);

  //console.log("Found the following sitemaps:", robot.getSitemaps());

  //const sitemapUrls = await getSitemapUrls(robot.getSitemaps()[0]);

  //sitemapUrls.forEach((url) => {
  //  console.log(
  //    ` - ${url} (${
  //      robot.isDisallowed(url, "SalesAIAssistant") ? "PROHIBITED" : "OK"
  //    })`
  //  );
  //});

  const scrapedContent = (
    await Promise.all(
      urls.map((url) =>
        limiter.schedule(() =>
          scrapeAndChunkWebsiteWithRetries(url, chunkSize, nRetries)
        )
      )
    )
  ).reduce((accumulator, value) => accumulator.concat(value), []);

  return scrapedContent;
};

export const identifyLikeliestCompanyFonectaFinderUrl = async (
  companyName: string
): Promise<string> => {
  const searchResults = await askGoogle(`${companyName} finder`);

  const websiteCandidates = searchResults
    .map((el) => ({ url: el.link, snippet: el.snippet }))
    .filter((el) => el.url.indexOf("finder.fi") !== -1);

  console.log(websiteCandidates);

  return websiteCandidates[0].url;
};
