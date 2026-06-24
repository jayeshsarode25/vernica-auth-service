import express from "express";
import * as contactController from "../controller/contact.controller.js";
import createAuthMiddleware from "../middleware/auth.middleware.js";
import {
  contactQueryListValidator,
  contactQueryStatusValidator,
  mongoIdParamValidator,
} from "../middleware/validation.middleware.js";

const router = express.Router();
const requireAdmin = createAuthMiddleware(["admin"]);

router.use(requireAdmin);

router.get("/", contactQueryListValidator, contactController.getContactQueries);
router.get("/:id", mongoIdParamValidator, contactController.getContactQueryById);
router.patch(
  "/:id/status",
  contactQueryStatusValidator,
  contactController.updateContactQueryStatus,
);
router.delete("/:id", mongoIdParamValidator, contactController.deleteContactQuery);

export default router;
