import { Router } from "express"
import { AuthMiddleware } from "../../middlewares/authMiddleware";
import { orgMiddleware } from "../../middlewares/orgMiddleware";
import { deleteMembership, fetchMemberhsip, inviteMembership, updateMembership } from "./memberships.controller";

const router = Router();

router.get("/", AuthMiddleware, orgMiddleware, fetchMemberhsip);

router.delete("/", AuthMiddleware, orgMiddleware, deleteMembership);

router.post("/invite", AuthMiddleware, orgMiddleware, inviteMembership);

router.patch("/updateRole", AuthMiddleware, orgMiddleware , updateMembership);

export default router;