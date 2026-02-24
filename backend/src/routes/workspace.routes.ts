import { Router, Request, Response } from "express";
import { poolClient } from "../db";
import { DatabaseError } from "pg";
import { workspaceCreationInterface, workspaceCreationSchema, workspaceDeleteParamsInterface, workspaceUpdateInterface, workspaceUpdateParamsInterface, workspaceUpdateSchema} from "../interfaces/workspaceInterfaces";
import crypto from "crypto";
import { orgMiddleware } from "../middlewares/orgMiddleware";
import { AuthMiddleware } from "../middlewares/authMiddleware";
import Roles from "../root";
import { number } from "zod";

const router = Router();

router.post("/", AuthMiddleware ,orgMiddleware , async(req: Request<{},{}, workspaceCreationInterface>, res: Response) => {
    if(!req.user){
        return res.status(401).json({message: "Unauthorised"});
    }
    const {userId, orgId, orgRole} = req.user;

    if(orgRole != Roles.ADMIN){
        console.log("userId: "+userId+" attempted to create workspace without admin access");
        return res.status(403).json({message: "Forbidden access"});
    }
    const parsedBody = workspaceCreationSchema.safeParse(req.body);
    if(!parsedBody.success){
        console.log("body validation failed for workspace creation", parsedBody.error);
        return res.status(400).json({message: "Invalid inputs", error: parsedBody.error.message});
    }
    let workspaceName = parsedBody.data.name;
    try{
        if(workspaceName == ""){
            workspaceName = "Default Workspace"+crypto.randomBytes(4).toString("hex");
        }
        console.log("Creating workspace with name: "+workspaceName+" for orgId: "+orgId+" by userId: "+userId);

    
        const workspaceRes = await poolClient.query("insert into workspaces(name, org_id, created_by) values($1,$2,$3) returning id",[workspaceName, orgId, userId]);
        console.log("Worspace created successfully with name: "+workspaceName+" for orgId: "+orgId+ " by userId: "+userId+" workspaceId: "+workspaceRes.rows[0].id);

        return res.status(201).json({message: "Workspace created successfully", data: {name: workspaceName, workspaceId: workspaceRes.rows[0].id}});
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            console.log("Workspace with the same name already exists for orgId: "+orgId);
            return res.status(409).json({message: "Workspace with the same name already exists"});
        }
        console.log("Error creating workspace with name: "+workspaceName+" for orgId: "+orgId+" by userId: "+userId, err);
        return res.status(500).json({message: "Internal server error"});
    }
});

router.get("/", AuthMiddleware, orgMiddleware, async(req: Request<workspaceDeleteParamsInterface>, res: Response) => {
    if(!req.user || !req.user.orgId){
        return res.status(401).json({message: "Unauthorised"});
    }
    const {orgId} = req.user;
    try{
        const workspaceQuery = await poolClient.query("select id, name from workspaces where org_id = $1 and deleted_at is null", [orgId]);
        return res.status(200).json({message: "Workspaces fetched successfully", data: workspaceQuery.rows});
    }catch(err){
        console.log("Error fetching workspaces for orgId: "+orgId, err);
        return res.status(500).json({message: "Internal server error"});
    }
});

router.delete("/:workspaceId", AuthMiddleware, orgMiddleware, async(req: Request, res: Response) => {
    if(!req.user || !req.user.userId || !req.user.orgId || !req.user.orgRole){
        return res.status(401).json({message: "Unauthorised"});
    }

    const {userId, orgId, orgRole} = req.user;
    
    const workspaceId = Number(req.params.workspaceId);

    if(isNaN(workspaceId) || workspaceId <= 0){
        return res.status(400).json({message: "Invalid workspaceId"});
    }

    if(orgRole != Roles.ADMIN){
        return res.status(403).json({message: "Forbidden access"});
    }

    try{
        const deleteQuery = await poolClient.query("update workspaces set deleted_at = now(), deleted_by = $1 where id = $2 and org_id = $3 returning id", [userId, workspaceId, orgId]);
        if(deleteQuery.rowCount == 0){
            return res.status(404).json({message: "Workspace not found"});
        }
        console.log("Workspace with id: "+workspaceId+" has been deleted by userId: "+userId);
        return res.status(200).json({message: "Workspace deleted successfully"});
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23503"){
            console.log("Attempted to delete workspace with id: "+workspaceId+" which has dependent records, by userId: "+userId);
            return res.status(409).json({message: "Cannot delete workspace with dependent records"});
        }
        console.log("Error deleting workspace with id: "+workspaceId+" by userId: "+userId, err);
        return res.status(500).json({message: "Internal server error"});
    }
});

router.patch("/:workspaceId", AuthMiddleware, orgMiddleware, async(req: Request<workspaceUpdateParamsInterface,{},workspaceUpdateInterface>, res:Response) => {
    if(!req.user || !req.user.userId || !req.user.orgId || !req.user.orgRole){
        return res.status(401).json({message: "Unauthorised"});
    }
    const {userId, orgId, orgRole} = req.user;
    if(orgRole == Roles.MEMBER){
        return res.status(403).json({message: "Forbidden access"});
    }
    const workspaceId = Number(req.params.workspaceId);
    if(isNaN(workspaceId) || workspaceId <= 0){
        return res.status(400).json({message: "Invalid workspaceId"});
    }

    const parsedData = workspaceUpdateSchema.safeParse(req.body);
    if(!parsedData.success){
        return res.status(400).json({message: "Invalid inputs", error: parsedData.error.message});
    }
    const workspaceName = parsedData.data.name;

    try{
        const updateWorkspaceQuery = await poolClient.query("update workspaces set name = $1, updated_at = now() where id = $2 and org_id = $3 and deleted_at is null returning id", [workspaceName, workspaceId, orgId]);
        if(updateWorkspaceQuery.rowCount == 0){
            return res.status(404).json({message: "Workspace not found"});
        }
        console.log("Workspace with id: "+workspaceId+" has been updated to name: "+workspaceName+" by userId: "+userId);
        return res.status(200).json({message: "Workspace updated successfully"});
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            console.log("Workspace with the same name already exists for orgId: "+orgId+", attempted to update workspace with id: "+workspaceId+" to name: "+workspaceName+" by userId: "+userId);
            return res.status(409).json({message: "Workspace with the same name already exists"});
        }
        console.log("Error updating workspace with id: "+workspaceId+" to name: "+workspaceName+" by userId: "+userId, err);
        return res.status(500).json({message: "Internal server error"});
    }
});

export default router;