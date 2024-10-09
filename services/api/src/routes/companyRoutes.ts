import { Router } from "express";
import { gatherCompanyInformation } from "../controllers/companyController";
import { validateQueryParams } from "../middlewares";

const router = Router();

router.post(
  "/company/gather-information",
  validateQueryParams([{ name: "companyName", type: "string" }]),
  gatherCompanyInformation
);

export default router;
