import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { FaissStore } from "langchain/vectorstores/faiss";
import { Chunk } from "./scraper";
import { OpenAI } from "openai";
import { Stream } from "openai/streaming";

//const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
//const OPENAI_API_URL = "https://api.openai.com/v1";

const MAX_TOKENS = 500;
const TEMPERATURE = 0.7;

export interface RAGResponse {
  prompt: string;
  answer: string;
  chunks: Chunk[];
}

const openai = new OpenAI({
  apiKey: process.env["OPENAI_API_KEY"], // This is the default and can be omitted
});

/*
const openAIApi: AxiosInstance = axios.create({
  baseURL: OPENAI_API_URL,
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${OPENAI_API_KEY}`,
  },
  timeout: 60000,
});
*/

/*
const use_chat_completions_openai_api_endpoint = async (
  gptModelVersion: string,
  messages: { role: string; content: string }[],
  maxTokens: number = MAX_TOKENS,
  temperature: number = TEMPERATURE,
  stream: boolean = false
): Promise<any> => {
  const axiosRequestConfig: AxiosRequestConfig = stream
    ? { responseType: "stream" }
    : {};
  try {
    const response = await openAIApi.post(
      "/chat/completions",
      {
        model: gptModelVersion,
        messages,
        max_tokens: maxTokens,
        temperature,
        stream,
      },
      axiosRequestConfig
    );
    return response.data;
  } catch (error: any) {
    throw new Error(error.message);
  }
};
*/

export const askGPT = async (
  gptModelVersion: string,
  question: string,
  maxTokens: number = MAX_TOKENS,
  temperature: number = TEMPERATURE
): Promise<string> => {
  const response = await openai.chat.completions.create({
    messages: [{ role: "user", content: question }],
    model: gptModelVersion,
    max_tokens: maxTokens,
    temperature: temperature,
    stream: false,
  });
  return response.choices[0].message.content || "";
};

export const askGPTStream = async (
  gptModelVersion: string,
  question: string,
  maxTokens: number = MAX_TOKENS,
  temperature: number = TEMPERATURE
): Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>> => {
  const response = await openai.chat.completions.create({
    messages: [{ role: "user", content: question }],
    model: gptModelVersion,
    max_tokens: maxTokens,
    temperature: temperature,
    stream: true,
  });
  return response;
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

  const answer = await askGPT(gptModelVersion, prompt, MAX_TOKENS, TEMPERATURE);

  const chunks = hits.map(
    ([hit, distance]) =>
      ({
        url: hit.metadata.url,
        index: hit.metadata.id,
        text: hit.pageContent,
      } as Chunk)
  );

  return { prompt, answer, chunks };
};
