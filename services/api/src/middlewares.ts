import { Request, Response, NextFunction } from "express";

// Type definition for validation rules
interface ParamRule {
  name: string;
  type: "string" | "int";
}

// Middleware to check for required query parameters and their types
export function validateQueryParams(rules: ParamRule[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const rule of rules) {
      const value = req.query[rule.name];

      // Check if the parameter exists
      if (value === undefined || value === null) {
        return res
          .status(400)
          .json({ error: `${rule.name} query parameter is required` });
      }

      // Validate type
      if (rule.type === "int" && isNaN(parseInt(value as string))) {
        return res
          .status(400)
          .json({ error: `${rule.name} must be a valid integer` });
      }

      if (rule.type === "string" && typeof value !== "string") {
        return res
          .status(400)
          .json({ error: `${rule.name} must be a valid string` });
      }
    }

    next(); // Proceed to the next middleware or route handler
  };
}
