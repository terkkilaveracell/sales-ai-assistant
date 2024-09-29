import { AzureOpenAI } from "openai";

const MAX_TOKENS = 500;
const TEMPERATURE = 0.7;
const GPT_MODEL_VERSION = "gpt-4o";

export class OpenAI {
  private azureOpenAIClient: AzureOpenAI = new AzureOpenAI({
    apiKey: process.env["OPENAI_API_KEY"],
    apiVersion: process.env["OPENAI_API_VERSION"],
    endpoint: process.env["OPENAI_ENDPOINT"],
    deployment: process.env["GPT4o_DEPLOYMENT_NAME"],
  });

  ask = async (query: string): Promise<string> => {
    const response = await this.azureOpenAIClient.chat.completions.create({
      messages: [{ role: "user", content: query }],
      model: GPT_MODEL_VERSION,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      stream: false,
    });
    return response.choices[0].message.content || "";
  };
}

export const askGPT = async (
  openai: AzureOpenAI,
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

export const makeEmbedding = async (
  openai: AzureOpenAI,
  embeddingModel: string,
  query: string
): Promise<number[]> => {
  const embedding = await openai.embeddings
    .create({ input: query, model: embeddingModel })
    .then((res) => res.data[0].embedding);

  return embedding;
};
