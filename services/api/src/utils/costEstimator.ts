import { encoding_for_model, TiktokenModel } from "tiktoken";

type AzureOpenAIModel = "gpt-4o-2024-08-06" | "text-embedding-ada-002";

// Define the model pricing per 1,000 tokens (you can adjust these values as per OpenAI pricing)
const pricing: Record<AzureOpenAIModel, { input: number; output: number }> = {
  "gpt-4o-2024-08-06": { input: 0.00275, output: 0.011 },
  "text-embedding-ada-002": { input: 0.0001, output: 0 },
};

// Function to estimate tokens and calculate cost
export const estimateCost = (
  model: AzureOpenAIModel,
  prompt: string,
  completion: string
): number => {
  const encoding = encoding_for_model(model as TiktokenModel); // Get the token encoding for the model

  const promptTokens = encoding.encode(prompt).length;
  const completionTokens = encoding.encode(completion).length;

  const totalTokens = promptTokens + completionTokens;

  const pricePerTokenInput = pricing[model].input;
  const pricePerTokenOutput = pricing[model].output;

  const inputCost = (promptTokens / 1000) * pricePerTokenInput;
  const outputCost = (completionTokens / 1000) * pricePerTokenOutput;

  const totalCost = inputCost + outputCost;

  return totalCost;
};
