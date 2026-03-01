import { Router } from "express";
import { orgMiddleware } from "../../middlewares/orgMiddleware";
import { AuthMiddleware } from "../../middlewares/authMiddleware";
import { createWorkspace, deleteWorkspace, fetchWorkspace, updateWorkspace } from "./workspaces.controller";

const router = Router();

router.post("/", AuthMiddleware ,orgMiddleware , createWorkspace);

router.get("/", AuthMiddleware, orgMiddleware, fetchWorkspace);

router.delete("/:workspaceId", AuthMiddleware, orgMiddleware, deleteWorkspace);

router.patch("/:workspaceId", AuthMiddleware, orgMiddleware, updateWorkspace);

export default router;