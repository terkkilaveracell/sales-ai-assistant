declare module "robots-parser" {
  export interface Robot {
    isAllowed(url: string, userAgent?: string): boolean;
    isDisallowed(url: string, userAgent?: string): boolean;
    getSitemaps(): string[];
    getCrawlDelay(userAgent?: string): number | null;
    // Add other methods and properties as needed
  }

  function robotsParser(url: string, robotsTxt: string): any;
  export default robotsParser;
}
