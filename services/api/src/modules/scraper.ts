import axios, { AxiosInstance } from "axios";
import { parseString } from "xml2js";
import robotsParser, { Robot } from "robots-parser";
import { CheerioWebBaseLoader } from "langchain/document_loaders/web/cheerio";
import { RecursiveCharacterTextSplitter } from "langchain/text_splitter";
import { HtmlToTextTransformer } from "langchain/document_transformers/html_to_text";
import { askGoogle } from "./google";

export interface Chunk {
  url: string;
  text: string;
  index: number;
}

const containsAnySubstring = (input: string, substrings: string[]): boolean => {
  return substrings.some((sub) => new RegExp(sub, "i").test(input));
};

const isCompanyUrlCandidate = (url: string) =>
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

export const scrapeWebsite = async (url: string): Promise<Chunk[]> => {
  const loader = new CheerioWebBaseLoader(url);

  const docs = await loader.load();

  const splitter = RecursiveCharacterTextSplitter.fromLanguage("html", {
    chunkSize: 500,
    chunkOverlap: 100,
  });
  const transformer = new HtmlToTextTransformer();

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

const convertXmlToJson = async (xml: string): Promise<any> => {
  return new Promise((resolve, reject) => {
    parseString(
      xml,
      {
        explicitArray: false,
        trim: true,
        normalize: true,
        normalizeTags: true,
      },
      (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      }
    );
  });
};

const getRobot = async (url: string): Promise<Robot> => {
  const robotsUrl = new URL("robots.txt", url).href;

  console.log(`Guessing robot file location: ${robotsUrl}`);

  const response = await axios.get(robotsUrl, { responseType: "text" });

  const robotsTxt = response.data;

  const robot = robotsParser(url, robotsTxt);

  return robot;
};

const getSitemapUrls = async (sitemapUrl: string): Promise<string[]> => {
  console.log(`Fetching sitemap URLs from: ${sitemapUrl}`);

  const response = await axios.get(sitemapUrl, { responseType: "text" });

  const sitemapXmlStr = response.data;

  const sitemap = await convertXmlToJson(sitemapXmlStr);

  const foo = sitemap.urlset.url as any[];
  const sitemapUrls = foo.map((el: any) => el.loc) as string[];

  return sitemapUrls;
};

export const scrapeWebsiteBySitemap = async (
  baseUrl: string
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
      [baseUrl, ...sitemapUrls].map(async (url) => await scrapeWebsite(url))
    )
  ).reduce((accumulator, value) => accumulator.concat(value), []);

  return scrapedContent;
};
