import express from "express";
import * as contactController from "../controller/contact.controller.js";
import { contactLimiter } from "../middleware/Security.middleware.js";
import { contactQueryValidator } from "../middleware/validation.middleware.js";

const router = express.Router();

router.post(
  "/",
  contactLimiter,
  contactQueryValidator,
  contactController.submitContactQuery,
);

export default router;
