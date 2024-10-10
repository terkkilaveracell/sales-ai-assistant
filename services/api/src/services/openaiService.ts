import tmp from "openai";
import { AzureOpenAI } from "openai";
import { AzureOpenAIModel, estimateCost } from "../utils/costEstimator";
import { databaseService as db } from "./databaseService";
import { generateJSONSchema } from "../utils/generateJSONSchema";

const MAX_TOKENS = 500;
const TEMPERATURE = 0.7;
const DEFAULT_OPENAI_MODEL_NAME = "gpt-4o-2024-08-06";

class AzureOpenAIWithCost {
  private azureOpenAIClient: AzureOpenAI = new AzureOpenAI({
    apiKey: process.env["OPENAI_API_KEY"],
    apiVersion: process.env["OPENAI_API_VERSION"],
    endpoint: process.env["OPENAI_ENDPOINT"],
    deployment: process.env["GPT4o_DEPLOYMENT_NAME"],
  });

  makeCompletion = async (
    params: tmp.Chat.ChatCompletionCreateParamsNonStreaming
  ) => {
    const response = await this.azureOpenAIClient.chat.completions.create(
      params
    );

    const inputPromptsConcatenated = params.messages
      .map((msg) => msg.content as string)
      .reduce((acc, content) => acc + content, " ");

    const outputResponse = response.choices[0].message.content || "";

    const cost = estimateCost(
      params.model as AzureOpenAIModel,
      inputPromptsConcatenated,
      outputResponse
    );

    db.accumulateDailyTotalCost(cost);

    return response;
  };

  makeEmbedding = async (params: tmp.EmbeddingCreateParams) => {
    const response = this.azureOpenAIClient.embeddings.create(params);

    const cost = estimateCost(
      params.model as AzureOpenAIModel,
      params.input as string,
      "" // Output is standard vector with fixed dimensionality (the embedding), and costs nothing
    );

    db.accumulateDailyTotalCost(cost);

    return response;
  };
}

class OpenAIService {
  private azureOpenAIClientWithCost: AzureOpenAIWithCost =
    new AzureOpenAIWithCost();

  private openaiCompletionModel =
    process.env["OPENAI_MODEL_NAME"] || DEFAULT_OPENAI_MODEL_NAME;

  makeCompletion = async (query: string): Promise<string> => {
    const response = await this.azureOpenAIClientWithCost.makeCompletion({
      messages: [{ role: "user", content: query }],
      model: this.openaiCompletionModel,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      stream: false,
    });
    return response.choices[0].message.content || "";
  };

  makeCompletionStructured = async <T>(query: string, typeName: string) => {
    const schema = generateJSONSchema<T>(typeName) as any;

    const systemPrompt = `"You are a helpful assistant that responds to user queries only according to the following JSON schema:"    
    ${JSON.stringify(schema)}
    `;

    const response = await this.azureOpenAIClientWithCost.makeCompletion({
      messages: [
        {
          role: "system",
          content: systemPrompt,
        },
        {
          role: "user",
          content: query,
        },
      ],
      model: this.openaiCompletionModel,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      stream: false,
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "StructuredOutput",
          schema: schema,
        },
      },
    });

    return JSON.parse(response.choices[0].message.content || "") as T;
  };

  makeEmbedding = async (
    embeddingModel: string,
    query: string
  ): Promise<number[]> => {
    const embedding = await this.azureOpenAIClientWithCost
      .makeEmbedding({ input: query, model: embeddingModel })
      .then((res) => res.data[0].embedding);

    return embedding;
  };
}

export const openaiService = new OpenAIService();
