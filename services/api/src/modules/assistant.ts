import { RAGStore, RAGResponse } from "./rag";
import { Chunk } from "./scraper";

export class Assistant {
  private ragStore: RAGStore = new RAGStore();

  constructor(chunks: Chunk[]) {
    chunks.forEach((chunk) => this.ragStore.add_chunk(chunk));
  }

  ask = async (query: string, numHits: number = 5) => {
    const chunks = await this.ragStore.search(query, numHits);

    return {
      prompt: query,
      answer: "answer",
      chunks,
    } as RAGResponse;
  };
}
