import axios from "axios";
import { logger } from "../utils/logger";
import { parseString } from "xml2js";
import { logMethod } from "../utils/logDecorator";

// Fetch and use the custom parser for robots.txt
export async function fetchRobotsTxt(baseUrl: string): Promise<string> {
  const robotsUrl = `${baseUrl}/robots.txt`;

  try {
    const response = await axios.get(robotsUrl);
    return response.data as string;
    //return new Robot(response.data);
  } catch (error) {
    return "";
    //console.warn("Failed to fetch robots.txt, allowing all URLs by default.");
    //return new Robot(""); // If no robots.txt is found, allow everything
  }
}

export class Robot {
  private disallowedPaths: string[] = [];
  private allowedPaths: string[] = [];
  private sitemaps: string[] = [];

  constructor(robotsTxt: string) {
    this.parseRobotsTxt(robotsTxt);
  }

  // Static async factory method to handle async logic and return a Robot instance
  //@logMethod()
  //public static async create(robotsUrl: string): Promise<Robot> {
  //  const robotsTxt = await fetchRobotsTxt(robotsUrl);
  //  return new Robot(robotsTxt);
  //}

  // Extract the value after the first colon (:) in the string
  //@logMethod()
  private extractAfterColon(line: string): string {
    const colonIndex = line.indexOf(":");
    if (colonIndex !== -1) {
      const lineAfterColon = line.substring(colonIndex + 1).trim();
      logger.info(`Line after colon: ${lineAfterColon}`);
      return lineAfterColon;
    }
    return "";
  }

  // Parse robots.txt and extract Disallow and Allow rules for the default user-agent (*)
  //@logMethod()
  private parseRobotsTxt(robotsTxt: string): void {
    const lines = robotsTxt.split("\n");
    let insideUserAgentBlock = false;

    for (let line of lines) {
      line = line.trim();

      // Start a new User-agent block
      if (line.toLowerCase().startsWith("user-agent:")) {
        insideUserAgentBlock = true; //line.toLowerCase().includes("*");
      }

      // Parse Disallow rules inside the User-agent: * block
      if (insideUserAgentBlock && line.toLowerCase().startsWith("disallow:")) {
        const disallowedPath = this.extractAfterColon(line);
        if (disallowedPath) {
          this.disallowedPaths.push(disallowedPath);
        }
      }

      // Parse Allow rules inside the User-agent: * block
      if (insideUserAgentBlock && line.toLowerCase().startsWith("allow:")) {
        const allowedPath = this.extractAfterColon(line);
        if (allowedPath) {
          this.allowedPaths.push(allowedPath);
        }
      }

      // Parse Sitemap directives (which are outside of User-agent blocks)
      if (line.toLowerCase().startsWith("sitemap:")) {
        logger.info(`Line starts with sitemap: ${line}`);
        const sitemapUrl = this.extractAfterColon(line);
        if (sitemapUrl) {
          logger.info(`Sitemap URL found: ${sitemapUrl}`);
          this.sitemaps.push(sitemapUrl);
        }
      }
    }
  }

  // Check if a URL is allowed to be crawled
  @logMethod()
  public isUrlAllowed(url: string): boolean {
    const urlPath = new URL(url).pathname;

    // Check if the path is explicitly allowed
    for (const allowedPath of this.allowedPaths) {
      if (urlPath.startsWith(allowedPath)) {
        return true; // Explicitly allowed
      }
    }

    // Check if the path is explicitly disallowed
    for (const disallowedPath of this.disallowedPaths) {
      if (urlPath.startsWith(disallowedPath)) {
        return false; // Explicitly disallowed
      }
    }

    // By default, allow the URL if not explicitly disallowed
    return true;
  }

  // Return the list of sitemaps found in robots.txt
  @logMethod()
  public getSitemaps(): string[] {
    return this.sitemaps;
  }

  @logMethod()
  private async fetchAndParseSitemap(url: string): Promise<string[]> {
    try {
      const response = await axios.get(url);
      return new Promise((resolve, reject) => {
        parseString(response.data, (err, result) => {
          if (err) {
            reject(err);
          } else {
            if (result.sitemapindex) {
              // It's a sitemap index
              logger.info(`Sitemap ${url} is an index`);
              const sitemaps = result.sitemapindex.sitemap.map(
                (s: any) => s.loc[0] as string
              );
              resolve(this.processSitemapIndex(sitemaps));
            } else {
              logger.info(`Sitemap ${url} is a regular sitemap`);
              // It's a regular sitemap
              const urls = result.urlset.url.map((urlEntry: any) => {
                //logger.info(JSON.stringify(urlEntry.loc[0].trim()));
                return urlEntry.loc[0].trim() as string;
              });
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

  @logMethod()
  private async processSitemapIndex(sitemapUrls: string[]): Promise<string[]> {
    const allUrls: string[] = [];
    for (const sitemapUrl of sitemapUrls) {
      const urls = await this.fetchAndParseSitemap(sitemapUrl);
      allUrls.push(...urls);
    }
    return allUrls;
  }

  @logMethod()
  public async getCrawlableUrlsBySitemaps(): Promise<string[]> {
    const sitemapUrls = await this.fetchAndParseSitemap(this.sitemaps[0]);

    const allowedSitemapUrls = sitemapUrls.filter((url) => {
      const isAllowed = this.isUrlAllowed(url);
      logger.info(` - ${url} => (${isAllowed ? "OK" : "PROHIBITED"})`);
      return isAllowed;
    });

    return allowedSitemapUrls;
  }
}
