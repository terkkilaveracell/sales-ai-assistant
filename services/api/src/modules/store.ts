import faiss from "faiss-node";
import { Chunk } from "./scraper";
import { AzureOpenAI } from "openai";

const makeEmbeddings = async (
  openai: AzureOpenAI,
  texts: string[]
): Promise<number[][]> => {
  const response = await openai.embeddings.create({
    model: "text-embedding-ada-002",
    input: texts,
  });
  const embeddings = response.data.map((item) => item.embedding);
  return embeddings;
};

export const makeVectorStore = async (
  openai: AzureOpenAI,
  chunks: Chunk[]
): Promise<faiss.Index> => {
  const texts = chunks.map((chunk) => chunk.text);
  const metadata = chunks.map((chunk) => ({
    id: chunk.index,
    url: chunk.url,
  }));

  const embeddings = await makeEmbeddings(openai, texts);

  // Step 2: Prepare embeddings into a Float32Array
  const nb = embeddings.length; // number of base vectors
  const dimension = embeddings[0].length;
  const xb = new Float32Array(nb * dimension);
  for (let i = 0; i < nb; i++) {
    xb.set(embeddings[i], i * dimension);
  }

  // Step 3: Create the index
  const index = new faiss.IndexFlatL2(dimension);

  // Step 4: Add vectors to the index
  for (let i = 0; i < embeddings.length; i++) {
    index.add(embeddings[i]);
  }

  // Step 5: Save the index to file
  //const indexPath = "faiss.index";
  //index.write(indexPath);

  // Step 6: Load the index from file
  //const loadedIndex = faiss.read_index(indexPath);

  // Step 7: Get embedding for query text
  const queryText = "Testing similarity search";
  const queryEmbeddings = await makeEmbeddings(openai, [queryText]);
  const nq = 1; // number of queries
  const xq = new Float32Array(nq * dimension);
  xq.set(queryEmbeddings[0], 0);

  // Step 8: Prepare output arrays for search
  const k = 5; // number of nearest neighbors
  const distances = new Float32Array(nq * k);
  const labels = new Int32Array(nq * k);

  // Step 9: Perform the search
  index.search(queryEmbeddings[0], k);

  // Step 10: Output results
  console.log("Distances:", distances);
  console.log("Labels:", labels);

  // Map labels to texts
  const results = [];
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (label >= 0 && label < texts.length) {
      results.push(texts[label]);
    } else {
      results.push(null);
    }
  }
  console.log("Results:", results);

  return index;
};
