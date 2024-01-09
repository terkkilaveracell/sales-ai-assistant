import axios from "axios";

// Google Custom Search API credentials
const API_KEY = "AIzaSyBsuO0uS2vPZFwPG0wuSIGhlLBuzNJJRUQ";
const CSE_ID = "f1438d35850324c59";

interface GoogleSearchResultItem {
  link: string;
  snippet: string;
}

export const askGoogle = async (
  query: string
): Promise<GoogleSearchResultItem[]> => {
  console.log(`Asking google: ${query}`);
  const urlWithQuery = `https://www.googleapis.com/customsearch/v1?key=${API_KEY}&cx=${CSE_ID}&q=${encodeURIComponent(
    query
  )}`;

  try {
    const response = await axios.get(urlWithQuery);
    const searchResults = response.data.items as GoogleSearchResultItem[];
    return searchResults;
  } catch {
    console.log("Some error happened");
    return [] as GoogleSearchResultItem[];
  }
};
