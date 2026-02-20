import { Router, Request, Response } from "express";
import { AuthMiddleware } from "../middlewares/authMiddleware";
import { createOrgInterface, createOrgSchema } from "../interfaces/orgInterfaces";
import { poolClient } from "../db";
import { DatabaseError } from "pg";
import Roles from "../root";


const router = Router();

router.post("/create", AuthMiddleware , async (req:Request<{},{}, createOrgInterface>, res:Response) => {
    const parsedResult = createOrgSchema.safeParse(req.body);
    if(!parsedResult.success){
        console.log("Validation failed for create organization request ", parsedResult.error.message);
        return res.status(400).json({message: "Invalid inputs", error: parsedResult.error.message});
    }
    const userId = req.user!.userId;
    const {name, slug} = parsedResult.data;
    console.log("organization creation request valdiated for user: ",userId, " with org name: ", name, " and slug: ", slug);
    
    const localClient = await poolClient.connect();
    try{
        await localClient.query("begin");
        const orgQuery = await localClient.query("insert into organizations(name, slug, created_by) values($1, $2, $3) returning id", [name, slug, userId]);
        const orgId = orgQuery.rows[0].id;

        await localClient.query("insert into memberships(org_id, user_id, role) values($1, $2, $3)", [orgId, userId, Roles.ADMIN]);
        
        await localClient.query("commit");

        return res.status(201).json({message: "Organization created successfully!", data: {id: orgId, name, slug}});
    
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            console.log("Organization with the same name or slug already exists for user: ", userId);
            await localClient.query("rollback");
            return res.status(409).json({message: "Organization with the same name or slug already exists"});
        }

        console.log("Error occured in the organization creation", err);
        await localClient.query("rollback");
        return res.status(500).json({message: "Internal server error"});
    }finally{
        localClient.release();
    }
});

export default router;