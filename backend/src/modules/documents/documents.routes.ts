import { Router } from "express";
import { orgMiddleware } from "../../middlewares/orgMiddleware";
import { AuthMiddleware } from "../../middlewares/authMiddleware";
import { createDocument, deleteDocument, fetchDocuments, updateDocument } from "./documents.controller";
import { errorHandler } from "../../shared/errorHandler";

const router = Router();

router.post("/:orgId/:workspaceId/:parentId?", AuthMiddleware ,orgMiddleware , errorHandler(createDocument));

router.delete("/:orgId/:workspaceId/:parentId?/:docId", AuthMiddleware, orgMiddleware, errorHandler(deleteDocument));

router.get("/:orgId/:workspaceId/:parentId?", AuthMiddleware, orgMiddleware, errorHandler(fetchDocuments));

router.patch("/:orgId/:workspaceId/:parentId?/:docId", AuthMiddleware, orgMiddleware, errorHandler(updateDocument));

export default router;