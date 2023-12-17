import { FaissStore } from "langchain/vectorstores/faiss";
import { OpenAIEmbeddings } from "langchain/embeddings/openai";
import { Chunk } from "./scraper";

export const makeVectorStore = async (chunks: Chunk[]): Promise<FaissStore> => {
  const content = chunks.map((chunk) => chunk.text);
  const metadata = chunks.map((chunk) => ({
    id: chunk.index,
    url: chunk.url,
  }));

  const vectorStore = await FaissStore.fromTexts(
    content,
    metadata,
    new OpenAIEmbeddings()
  );

  return vectorStore;
};
