import { Router } from "express";
import {
  gatherCompanyInformation,
  getCompanies,
} from "../controllers/companyController";
import { validateQueryParams } from "../middlewares";

const router = Router();

router.get("/companies", getCompanies);

router.post(
  "/company/gather-information",
  validateQueryParams([{ name: "companyName", type: "string" }]),
  gatherCompanyInformation
);

export default router;
