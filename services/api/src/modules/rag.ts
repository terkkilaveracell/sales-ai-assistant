import { Index } from "faiss-node";
import { AzureOpenAI } from "openai";
import { Chunk } from "./scraper";
import { makeEmbedding } from "./openai";

const DIMENSIONALITY = 1536;

export interface RAGResponse {
  prompt: string;
  answer: string;
  chunks: Chunk[];
}

export class RAGStore {
  private embeddingModel: string = "text-embedding-ada-002";
  private index: Index = new Index(DIMENSIONALITY);
  private chunks: Chunk[] = [];
  private openai: AzureOpenAI = new AzureOpenAI({
    apiKey: process.env["OPENAI_API_KEY"],
    apiVersion: process.env["OPENAI_API_VERSION"],
    endpoint: process.env["OPENAI_ENDPOINT"],
    deployment: process.env["GPT4o_DEPLOYMENT_NAME"],
  });

  add_chunk = async (chunk: Chunk): Promise<void> => {
    this.chunks.push(chunk);
    const embedding = await makeEmbedding(
      this.openai,
      this.embeddingModel,
      chunk.text
    );
    this.index.add(embedding);
  };

  search = async (query: string, numHits: number): Promise<Chunk[]> => {
    const embedding = await makeEmbedding(
      this.openai,
      this.embeddingModel,
      query
    );

    const searchResult = await this.index.search(embedding, numHits);

    const hits = searchResult.labels;

    return hits.map((hit) => this.chunks[hit]);
  };
}
