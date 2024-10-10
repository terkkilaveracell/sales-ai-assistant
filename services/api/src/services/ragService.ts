import { Index } from "faiss-node";
import { Chunk } from "../modules/scraper";
import { openaiService as openai } from "../services/openaiService";

const DIMENSIONALITY = 1536;

const DEFAULT_OPENAI_EMBEDDING_MODEL_NAME = "text-embedding-ada-002";

export interface RAGResponse {
  prompt: string;
  answer: string;
  chunks: Chunk[];
}

class RAGService {
  private embeddingModel: string =
    process.env["OPENAI_EMBEDDING_MODEL_NAME"] ||
    DEFAULT_OPENAI_EMBEDDING_MODEL_NAME;
  private index: Index = new Index(DIMENSIONALITY);
  private chunks: Chunk[] = [];

  add_chunk = async (chunk: Chunk): Promise<void> => {
    this.chunks.push(chunk);
    const embedding = await openai.makeEmbedding(
      this.embeddingModel,
      chunk.text
    );
    this.index.add(embedding);
  };

  search = async (query: string, numHits: number): Promise<Chunk[]> => {
    const embedding = await openai.makeEmbedding(this.embeddingModel, query);

    const searchResult = await this.index.search(embedding, numHits);

    const hits = searchResult.labels;

    return hits.map((hit) => this.chunks[hit]);
  };

  ask = async (query: string) => {
    return {
      prompt: query,
      answer: "dummy",
      chunks: [],
    } as RAGResponse;
  };
}

export const ragService = new RAGService();
