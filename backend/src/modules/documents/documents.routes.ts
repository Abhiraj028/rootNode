import { Router } from "express";
import { orgMiddleware } from "../../middlewares/orgMiddleware";
import { AuthMiddleware } from "../../middlewares/authMiddleware";
import { createDocument, deleteDocument, fetchDocuments, updateDocument } from "./documents.controller";

const router = Router();

router.post("/:workspaceId/:parentId?", AuthMiddleware ,orgMiddleware , createDocument);

router.delete("/:workspaceId/:parentId?/:docId", AuthMiddleware, orgMiddleware, deleteDocument);

router.get("/:workspaceId/:parentId?", AuthMiddleware, orgMiddleware, fetchDocuments);

router.patch("/:workspaceId/:parentId?/:docId", AuthMiddleware, orgMiddleware, updateDocument);


export default router;