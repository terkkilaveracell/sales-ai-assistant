import { ragService as rag, RAGResponse } from "../services/ragService";
import { Chunk } from "./scraper";

export class Assistant {
  //private ragStore: RAGStore = new RAGStore();
  //constructor(chunks: Chunk[]) {
  //  chunks.forEach((chunk) => this.rag.add_chunk(chunk));
  //}
  /*
  ask = async (query: string, numHits: number = 5) => {
    const chunks = await this.ragStore.search(query, numHits);

    return {
      prompt: query,
      answer: "answer",
      chunks,
    } as RAGResponse;
  };
  */
}
