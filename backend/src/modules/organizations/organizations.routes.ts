import { Router } from "express";
import { AuthMiddleware } from "../../middlewares/authMiddleware";
import { orgMiddleware } from "../../middlewares/orgMiddleware";
import { createOrganization, deleteOrganization, fetchOrganization, updateOrganization } from "./organizations.controller";

const router = Router();

router.get("/", AuthMiddleware, fetchOrganization);

router.post("/", AuthMiddleware , createOrganization); 

router.delete("/", AuthMiddleware, orgMiddleware, deleteOrganization);

router.patch("/update", AuthMiddleware, orgMiddleware, updateOrganization);

export default router;