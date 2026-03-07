import { Router } from "express"
import { AuthMiddleware } from "../../middlewares/authMiddleware";
import { orgMiddleware } from "../../middlewares/orgMiddleware";
import { deleteMembership, fetchMembership, inviteMembership, updateMembership } from "./memberships.controller";
import { errorHandler } from "../../shared/errorHandler";

const router = Router();

router.get("/:orgId", AuthMiddleware, orgMiddleware, errorHandler(fetchMembership));

router.delete("/:orgId", AuthMiddleware, orgMiddleware, errorHandler(deleteMembership));

router.post("/:orgId/invite", AuthMiddleware, orgMiddleware, errorHandler(inviteMembership));

router.patch("/:orgId/updateRole", AuthMiddleware, orgMiddleware , errorHandler(updateMembership));

export default router;