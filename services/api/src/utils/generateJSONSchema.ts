import { createGenerator } from "ts-json-schema-generator";
import { JSONSchema7, JSONSchema7Definition } from "json-schema";

export const generateJSONSchema = <T>(
  typeName: string
): JSONSchema7Definition => {
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
