import { Router } from "express";
import { orgMiddleware } from "../../middlewares/orgMiddleware";
import { AuthMiddleware } from "../../middlewares/authMiddleware";
import { createWorkspace, deleteWorkspace, fetchWorkspace, updateWorkspace } from "./workspace.controllers";

const router = Router();

router.post("/:orgId", AuthMiddleware ,orgMiddleware , createWorkspace);

router.get("/:orgId", AuthMiddleware, orgMiddleware, fetchWorkspace);

router.delete("/:orgId/:workspaceId", AuthMiddleware, orgMiddleware, deleteWorkspace);

router.patch("/:orgId/:workspaceId", AuthMiddleware, orgMiddleware, updateWorkspace);

export default router;