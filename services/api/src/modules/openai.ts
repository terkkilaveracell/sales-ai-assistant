import axios, { AxiosInstance } from "axios";
import { FaissStore } from "langchain/vectorstores/faiss";
import { Chunk } from "./scraper";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_API_URL = "https://api.openai.com/v1";

//const OPENAI_GPT_MODEL = "gpt-3.5-turbo";

export interface RAGResponse {
  prompt: string;
  answer: string;
  chunks: Chunk[];
}

const openAIApi: AxiosInstance = axios.create({
  baseURL: OPENAI_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
  timeout: 30000,
});

const use_chat_completions_openai_api_endpoint = async (
  gptModelVersion: string,
  messages: { role: string; content: string }[],
  maxTokens: number = 500,
  temperature: number = 0.7
): Promise<any> => {
  try {
    const response = await openAIApi.post("/chat/completions", {
      model: gptModelVersion,
      messages,
      max_tokens: maxTokens,
      temperature,
    });
    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};

export const askGPT = async (
  gptModelVersion: string,
  question: string
): Promise<string> => {
  const messages = [{ role: "user", content: question }];
  const response = await use_chat_completions_openai_api_endpoint(
    gptModelVersion,
    messages
  );
  return response.choices[0].message.content;
};

export const askGPTWithRAG = async (
  gptModelVersion: string,
  vectorStore: FaissStore,
  query: string,
  format?: string,
  example?: string
): Promise<RAGResponse> => {
  const hits = await vectorStore.similaritySearchWithScore(query);

  console.log(query);
  hits.forEach((hit) => {
    console.log(hit);
  });

  const printFormat = () => {
    return `

Output format:
${format}

`;
  };

  const printExamples = () => {
    return `

Output example:
${example}

    `;
  };

  const prompt = `

Question:
${query}

General instructions:
Use the following reference material, scraped from a website, to answer the privided question. 
The reference material is split into chunks, and can originate from different websites. Each chunk is assocated with euclidean distance score.
Use the score as a guideline when weighing the relevance of each chunk in forming the response. Smaller euclidean distance means higher similarity.

${format ? printFormat() : ""}

${example ? printExamples() : ""}

Reference material:

${hits
  .map(([hit, distance]) => {
    return `Distance: ${distance}\nURL: ${hit.metadata.url}\nChunk: ${hit.pageContent}\n`;
  })
  .join("\n")}

`;

  console.log(prompt);

  const answer = await askGPT(gptModelVersion, prompt);

  return { prompt, answer, chunks: [] };
};
