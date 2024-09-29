import { Router } from "express";
import { companyGoogleSearch } from "../controllers/companyController";

const router = Router();

router.post("/company/google-search", companyGoogleSearch);

export default router;
