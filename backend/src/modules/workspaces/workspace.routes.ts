import { Router } from "express";
import { orgMiddleware } from "../../middlewares/orgMiddleware";
import { AuthMiddleware } from "../../middlewares/authMiddleware";
import { createWorkspace, deleteWorkspace, fetchWorkspace, updateWorkspace } from "./workspace.controllers";
import { errorHandler } from "../../shared/errorHandler";

const router = Router();

router.post("/:orgId", AuthMiddleware ,orgMiddleware , errorHandler(createWorkspace));

router.get("/:orgId", AuthMiddleware, orgMiddleware, errorHandler(fetchWorkspace));

router.delete("/:orgId/:workspaceId", AuthMiddleware, orgMiddleware, errorHandler(deleteWorkspace));

router.patch("/:orgId/:workspaceId", AuthMiddleware, orgMiddleware, errorHandler(updateWorkspace));

export default router;