import axios, { AxiosInstance, AxiosRequestConfig } from "axios";
import { FaissStore } from "langchain/vectorstores/faiss";
import { Chunk } from "./scraper";
import { OpenAI } from "openai";
import { Stream } from "openai/streaming";

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

export const askGPT = async (
  gptModelVersion: string,
  question: string,
  maxTokens: number = MAX_TOKENS,
  temperature: number = TEMPERATURE
): Promise<string> => {
  console.log(`Asking GPT:\n\n${question}`);
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

Query:
${query}

General instructions:
Use the following reference material, scraped from a website, to answer the provided query.
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
