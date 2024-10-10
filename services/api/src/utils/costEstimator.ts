import { encoding_for_model, TiktokenModel } from "tiktoken";

export type AzureOpenAIModel = "gpt-4o-2024-08-06" | "text-embedding-ada-002";

// Define the model pricing per 1,000 tokens (you can adjust these values as per OpenAI pricing)
const pricing: Record<AzureOpenAIModel, { input: number; output: number }> = {
  "gpt-4o-2024-08-06": { input: 0.00275, output: 0.011 },
  "text-embedding-ada-002": { input: 0.0001, output: 0 },
};

// Function to estimate tokens and calculate cost
export const estimateCost = (
  model: AzureOpenAIModel,
  input: string,
  output: string
): number => {
  const encoding = encoding_for_model(model as TiktokenModel); // Get the token encoding for the model

  const inputTokens = encoding.encode(input).length;
  const inputCost = (inputTokens / 1000) * pricing[model].input;

  const outputTokens = encoding.encode(output).length;
  const outputCost = (outputTokens / 1000) * pricing[model].output;

  const totalCost = inputCost + outputCost;

  return totalCost;
};
