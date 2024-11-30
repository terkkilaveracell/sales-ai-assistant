import { Request, Response } from "express";
import { companyService } from "../services/companyService";

export async function gatherCompanyInformation(req: Request, res: Response) {
  try {
    const companyName = req.query.companyName as string;

    companyService.gatherCompanyInformationInBackground(companyName);

    res.json({ message: "Started gathering company information. Stay tuned." });
  } catch (error) {
    console.error("Error in companyGgoogleSearch controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

export async function getCompanies(req: Request, res: Response) {
  try {
    const companies = await companyService.getCompanies();
    res.json(companies);
  } catch (error) {
    console.error("Error in getCompanies controller:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}
