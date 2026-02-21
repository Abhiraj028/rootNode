import { Router, Request, Response } from "express";
import { AuthMiddleware } from "../middlewares/authMiddleware";
import { createOrgInterface, createOrgSchema, updateOrgInterface, updateOrgSchema } from "../interfaces/orgInterfaces";
import { poolClient } from "../db";
import { DatabaseError } from "pg";
import Roles from "../root";
import { orgMiddleware } from "../middlewares/orgMiddleware";


const router = Router();

router.get("/", AuthMiddleware, async(req: Request, res: Response) => {
    if(!req.user || !req.user.userId){
        return res.status(401).json({message: "Unauthorised"});
    }
    const {userId} = req.user;
    try{
        const resQuery = await poolClient.query("select o.id, o.name, o.slug, m.role from organizations o join memberships m on o.id = m.org_id where m.user_id = $1 and m.deleted_at is null and o.deleted_at is null",[userId]);
        return res.status(200).json({message: "Organizations fetched successfully", data: resQuery.rows});
    }catch(err){
        console.log("Error occured in fetching organizations for user: ", userId, " error: ", err);
        return res.status(500).json({message: "Internal server error"});
    }
});

router.post("/create", AuthMiddleware , async (req:Request<{},{}, createOrgInterface>, res:Response) => {
    if(!req.user || !req.user.userId){
        return res.status(401).json({message: "Unauthorised"});
    }
    const userId = req.user.userId;
    const parsedResult = createOrgSchema.safeParse(req.body);
    if(!parsedResult.success){
        console.log("Validation failed for create organization request ", parsedResult.error.message);
        return res.status(400).json({message: "Invalid inputs", error: parsedResult.error.message});
    }
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

router.delete("/delete", AuthMiddleware, orgMiddleware, async(req: Request, res: Response) => {
    try{
        if(!req.user || !req.user.userId || !req.user.orgId || !req.user.orgRole){
            return res.status(401).json({message: "Unauthorised"});
        }

        const {userId, orgId, orgRole} = req.user;
        
        if(orgRole != Roles.ADMIN){
            return res.status(403).json({message: "Forbidden access"});
        }

        const delQuery = await poolClient.query("update organizations set deleted_by = $1, deleted_at = now() where id = $2 and deleted_at is null returning id", [userId, orgId]);
        if(delQuery.rowCount == 0){
            return res.status(404).json({message: "Organization not found"});
        }
        console.log("Organization with id: "+orgId+" has been deleted by userId: "+userId);
        return res.status(200).json({message: "Organization deleted successfully"});
    }catch(err){
        console.log("Error occured in organization deletion", err);
        return res.status(500).json({message: "Internal server error"});
    }
});

router.patch("/update", AuthMiddleware, orgMiddleware, async(req: Request<{}, {}, updateOrgInterface>, res:Response) => {
    if(!req.user || !req.user.userId || !req.user.orgId || !req.user.orgRole){
        return res.status(401).json({message: "Unauthorised"});
    }
    
    const parsedResult = updateOrgSchema.safeParse(req.body);
    if(!parsedResult.success){
        console.log("Validation failed for update organization request ", parsedResult.error.message);
        return res.status(400).json({message: "Invalid inputs", error: parsedResult.error.message});
    }

    const {name, slug} = parsedResult.data;
    const {userId, orgId, orgRole} = req.user;

    if(name == undefined && slug == undefined){
        return res.status(400).json({message: "At least one field (name or slug) must be provided for update"});
    }

    if(orgRole != Roles.ADMIN){
        return res.status(403).json({message: "Forbidden access"});
    }

    try{
        if(name == undefined){
            const resQuery = await poolClient.query("update organizations set slug = $1, updated_at = now() where id = $2 and deleted_at is null returning id , name, slug", [slug, orgId]);
            return res.status(200).json({message: "Organization updated successfully", data: resQuery.rows[0]});
        }
        if(slug == undefined){
            const resQuery = await poolClient.query("update organizations set name = $1, updated_at = now() where id = $2 and deleted_at is null returning id , name, slug", [name, orgId]);
            return res.status(200).json({message: "Organization updated successfully", data: resQuery.rows[0]});
        }
        const resQuery = await poolClient.query("update organizations set name = $1, slug = $2, updated_at = now() where id = $3 and deleted_at is null returning id , name, slug", [name, slug, orgId]);
        if(resQuery.rowCount == 0){
            return res.status(404).json({message: "Organization not found"});
        }
        return res.status(200).json({message: "Organization updated successfully", data: resQuery.rows[0]});
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            console.log("Organization with the same name or slug already exists for user: ", userId);
            return res.status(409).json({message: "Organization with the same name or slug already exists"});
        }
        console.log("Error occured in organization update", err);
        return res.status(500).json({message: "Internal server error"});
    }
});


export default router;