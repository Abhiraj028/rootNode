import { Router, Request, Response } from "express";
import { poolClient } from "../db";
import { DatabaseError } from "pg";
import { workspaceCreationInterface, workspaceCreationSchema } from "../interfaces/workspaceInterfaces";
import crypto from "crypto";

const router = Router();

router.post("/create", async(req: Request<{},{}, workspaceCreationInterface>, res: Response) => {
    if(!req.user){
        return res.status(401).json({message: "Unauthorised"});
    }
    const {userId, orgId, orgRole} = req.user;

    if(orgRole != "admin"){
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

export default router;