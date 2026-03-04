import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/authMiddleware";
import { orgMiddleware } from "../../middlewares/orgMiddleware";
import { createOrganization, deleteOrganization, fetchOrganization, updateOrganization } from "./organizations.controller";
import { errorHandler } from "../../shared/errorHandler";

const router = Router();

router.get("/", AuthMiddleware, errorHandler(fetchOrganization));

router.post("/", AuthMiddleware , errorHandler(createOrganization));

router.delete("/", AuthMiddleware, orgMiddleware, errorHandler(deleteOrganization));

router.patch("/update", AuthMiddleware, orgMiddleware, errorHandler(updateOrganization));

export default router;