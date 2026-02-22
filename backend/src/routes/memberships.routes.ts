import { Router, Request, Response, NextFunction } from "express"
import { AuthMiddleware } from "../middlewares/authMiddleware";
import { orgMiddleware } from "../middlewares/orgMiddleware";
import { poolClient } from "../db";
import Roles from "../root";
import { MembershipDeleteInterface, MembershipDeleteSchema, MembershipInviteInterface, MembershipInviteSchema, MembershipUpdateRoleInterface, MembershipUpdateRoleSchema } from "../interfaces/membershipInterfaces";
import { DatabaseError } from "pg";

const router = Router();

router.get("/", AuthMiddleware, orgMiddleware, async(req: Request, res: Response) => {
    try{
        if(!req.user || !req.user.orgId) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const{ orgId } = req.user;
        const resQuery = await poolClient.query("select u.id, u.name, u.email, m.role, m.id as membership_id from users u join memberships m on u.id = m.user_id where m.org_id = $1 and m.deleted_at is null and u.deleted_at is null",[orgId]);
        
        return res.status(200).json({message: "Members fetched successfully", members: resQuery.rows});
    }catch(err){
        console.log("Error fetching members: ", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
    
});

router.delete("/", AuthMiddleware, orgMiddleware, async(req: Request<{}, {}, MembershipDeleteInterface>, res: Response) => {
    if(!req.user || !req.user.orgId || !req.user.userId || !req.user.orgRole) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const { userId, orgId, orgRole} = req.user;
    if(orgRole != Roles.ADMIN){
        return res.status(403).json({ message: "Forbidden" });
    }
    const parsedData = MembershipDeleteSchema.safeParse(req.body);
    if(!parsedData.success){
        return res.status(400).json({ message: "Invalid request data", errors: parsedData.error.message});
    }

    const { memberUserId } = parsedData.data;
    
    const userRoleCheckQuery = await poolClient.query("select role from memberships where user_id = $1 and org_id = $2 and deleted_at is null", [memberUserId, orgId]);
    if(userRoleCheckQuery.rowCount == 0){
        return res.status(404).json({ message: "Membership not found" });
    }
    if(userRoleCheckQuery.rows[0].role == "admin"){
        const adminCountQuery = await poolClient.query("select count(*) from memberships where org_id = $1 and role = 'admin' and deleted_at is null", [orgId]);
        if(adminCountQuery.rows[0].count <= 1){
            return res.status(400).json({ message: "Organization must have at least one admin" });
        }
    }
    
    const reqQuery = await poolClient.query("update memberships set deleted_at = now() where user_id = $1 and org_id = $2 and deleted_at is null returning id",[memberUserId, orgId]);
    if(reqQuery.rowCount == 0){
        return res.status(404).json({ message: "Membership not found or already deleted" });
    }
    console.log(`Membership with id ${reqQuery.rows[0].id} marked as deleted by user ${userId} in org ${orgId}`);
    return res.status(200).json({ message: "Member removed successfully" });
    
});

router.post("/invite", AuthMiddleware, orgMiddleware, async(req: Request<{}, {}, MembershipInviteInterface>, res: Response) => {
    if(!req.user || !req.user.orgId || !req.user.userId || !req.user.orgRole) {
        return res.status(401).json({ message: "Unauthorized" });
    }
    const {userId, orgId, orgRole} = req.user;
    if(orgRole != Roles.ADMIN){
        return res.status(403).json({ message: "Forbidden" });
    }

    const parsedData = MembershipInviteSchema.safeParse(req.body);
    if(!parsedData.success){
        return res.status(400).json({ message: "Invalid request data", errors: parsedData.error.message});
    }
    const {memberUserId, newRole} = parsedData.data;

    try{
        const resQuery = await poolClient.query("insert into memberships(org_id, user_id, role, invited_by, created_at) values($1,$2,$3,$4, now()) returning id", [orgId, memberUserId, newRole, userId]);
        console.log(`User ${memberUserId} invited as ${newRole} by user ${userId} in org ${orgId} with membership id ${resQuery.rows[0].id}`);
        return res.status(201).json({ message: "Member invited successfully" });
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            console.log(`User ${memberUserId} is already a member of org ${orgId}`);
            return res.status(409).json({ message: "User is already a member of the organization" });
        }
        console.log("Error inviting member: ", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

router.patch("/updateRole", AuthMiddleware, orgMiddleware ,async (req: Request<{},{},MembershipUpdateRoleInterface>, res: Response) => {
    
    try{
        if(!req.user || !req.user.orgId || !req.user.userId || !req.user.orgRole) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        const {userId, orgId, orgRole} = req.user;
        if(orgRole != Roles.ADMIN){
            return res.status(403).json({ message: "Forbidden" });
        }

        const parsedData = MembershipUpdateRoleSchema.safeParse(req.body);
        if(!parsedData.success){
            return res.status(400).json({ message: "Invalid request data", errors: parsedData.error.message});
        }

        const {memberUserId, newRole} = parsedData.data;
        if(newRole != "admin"){
            const userRoleCheckQuery = await poolClient.query("select role from memberships where user_id = $1 and org_id = $2 and deleted_at is null", [memberUserId, orgId]);
            if(userRoleCheckQuery.rowCount == 0){
                return res.status(404).json({ message: "Membership not found" });
            }
            if(userRoleCheckQuery.rows[0].role == "admin"){
                const adminCountQuery = await poolClient.query("select count(*) from memberships where org_id = $1 and role = 'admin' and deleted_at is null", [orgId]);
                if(adminCountQuery.rows[0].count <= 1){
                    return res.status(400).json({ message: "Organization must have at least one admin" });
                }
            }
        }

        const resQuery = await poolClient.query("update memberships set role = $1, updated_at = now() where user_id = $2 and org_id = $3 and deleted_at is null returning id", [newRole, memberUserId, orgId]);
        if(resQuery.rowCount == 0){
            return res.status(404).json({ message: "Membership not found or already deleted" });
        }
        console.log(`Membership with id ${resQuery.rows[0].id} role updated to ${newRole} by user ${userId} in org ${orgId}`);
        return res.status(200).json({ message: "Member role updated successfully" });
    }catch(err){
        console.log("Error updating member role: ", err);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});

export default router;