import { AzureOpenAI } from "openai";
import { createGenerator } from "ts-json-schema-generator";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";
//import { TypeMappings } from "../schemas";

const MAX_TOKENS = 500;
const TEMPERATURE = 0.7;
const DEFAULT_OPENAI_MODEL_NAME = "gpt-4o";

/*
function getTypeName<T>(): typeof TypeMappings {
  const name = Object.keys(TypeMappings).find(
    (key) => TypeMappings[key] === ({} as T).constructor
  );
  if (!name) {
    throw new Error("Type name not found");
  }
  return name;
}
*/

const generateJSONSchema = <T>(typeName: string): JSONSchema7Definition => {
  // Configure the generator
  const config = {
    path: "./src/schemas.ts", // The path to the current file containing the interface
    tsconfig: "tsconfig.json", // The path to your tsconfig.json
    type: typeName, // The name of the interface to convert to JSON schema
  };

  const generator = createGenerator(config);

  const schema = generator.createSchema(typeName) as JSONSchema7;

  const schemaDefinition = schema.definitions?.[typeName];

  if (schemaDefinition) {
    return schemaDefinition;
  } else {
    throw new Error(`Could not generate a valid schema for ${typeName}`);
  }
};

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
      model: process.env["OPENAI_MODEL_NAME"] || DEFAULT_OPENAI_MODEL_NAME,
      max_tokens: MAX_TOKENS,
      temperature: TEMPERATURE,
      stream: false,
    });
    return response.choices[0].message.content || "";
  };

  askStructured = async <T>(query: string, typeName: string) => {
    const schema = generateJSONSchema<T>(typeName) as any;

    const systemPrompt = `"You are a helpful assistant that responds to user queries only according to the following JSON schema:"    
    ${JSON.stringify(schema)}
    `;

    const response = await this.azureOpenAIClient.chat.completions.create({
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
      model: process.env["OPENAI_MODEL_NAME"] || DEFAULT_OPENAI_MODEL_NAME,
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
}

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
