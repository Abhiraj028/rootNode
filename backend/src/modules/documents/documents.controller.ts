import { Request, Response } from "express";
import { createDocInterface, createDocParamsInterface, createDocSchema, deleteDocParamsInterface, updateDocInterface, updateDocParamsInterface, updateDocSchema } from "./documentInterfaces";
import { poolClient } from "../../db";
import crypto from "crypto";
import { DatabaseError } from "pg";
import Roles from "../../enum";

export const createDocument = async(req: Request<createDocParamsInterface,{}, createDocInterface>   , res: Response) => {
    // Ensure auth middleware populated user context.
    if(!req.user || !req.user.userId || !req.user.orgId || !req.user.orgRole){
        return res.status(400).json({message: "Invalid user data in request"});
    }
    const {userId, orgId, orgRole} = req.user;

    const parsedData = createDocSchema.safeParse(req.body);
    if(!parsedData.success){
        return res.status(400).json({message: "Invalid inputs", error: parsedData.error.message});
    }


    // Validate workspace and (optional) parent folder context.
    const workspaceId = Number(req.params.workspaceId);

    if(!Number.isInteger(workspaceId) || workspaceId <= 0){
        return res.status(400).json({message: "Invalid workspaceId"});
    }
    const workspaceCheck = await poolClient.query("select org_id from workspaces where id = $1",[workspaceId]);
    if(workspaceCheck.rowCount == 0 || workspaceCheck.rows[0].org_id != orgId){
        return res.status(403).json({message: "Forbidden"});
    }
    
    let parentIdParam = req.params.parentId;

    const parentId = parentIdParam ? Number(parentIdParam) : null;

    if(parentId != null && (!Number.isInteger(parentId) || parentId <= 0)){
        return res.status(400).json({message: "Invalid parentId"});
    }

    if(parentId != null){
        // Parent must exist within the same org/workspace.
        const parentCheck = await poolClient.query("select org_id from documents where id = $1 and workspace_id = $2", [parentId, workspaceId]);
        if(parentCheck.rowCount == 0 || parentCheck.rows[0].org_id != orgId){
            return res.status(403).json({message: "Forbidden"});
        }
    }

    let { name, title, content } = parsedData.data;
    if(name == ""){
        name = "Untitled Document" + crypto.randomBytes(4).toString("hex");
    }

    try{
        const queryOut = await poolClient.query("insert into documents(name, title, content, org_id, created_by, parent_id, workspace_id) values($1,$2,$3,$4,$5,$6,$7) returning id", [name, title, content, orgId, userId, parentId, workspaceId]);
        console.log("Successfull Document creation with name: "+name+" for orgId: "+orgId+" by userId: "+userId+" with role: "+orgRole);
        return res.status(201).json({message: "Document created successfully", data: {id: queryOut.rows[0].id, name, title, content}});
    }catch(err){
        if(err instanceof DatabaseError && err.code == "23505"){
            return res.status(409).json({message: "Document name already exists"});
        }
        if(err instanceof DatabaseError && err.code == "23503"){
            return res.status(400).json({message: "Invalid ancestorId"});
        }
        console.log("Error occured in document creation. "+err);
        return res.status(500).json("Some error occured");
    }
}

export const deleteDocument = async(req: Request<deleteDocParamsInterface>, res: Response) => {
    // Guard against missing auth context.
    if(!req.user || !req.user.userId || !req.user.orgId || !req.user.orgRole){
        return res.status(401).json({message: "Invalid user data in request"});
    }

    const workspaceId = Number(req.params.workspaceId);
    if(!Number.isInteger(workspaceId) || workspaceId <= 0){
        return res.status(400).json({message: "Invalid workspaceId"});
    }
    
    const docId = Number(req.params.docId);
    if(!Number.isInteger(docId) || docId <= 0){
        return res.status(400).json({message: "Invalid document id"});
    }

    const {userId, orgId, orgRole} = req.user;


    // Confirm document is in the org and check ownership for members.
    const docCheck = await poolClient.query("select org_id, created_by from documents where id = $1 and workspace_id = $2 and org_id = $3", [docId, workspaceId, orgId]);
    if(docCheck.rowCount == 0 || docCheck.rows[0].org_id != orgId){
        return res.status(403).json({message: "Forbidden"});
    }

    if(orgRole == Roles.MEMBER && docCheck.rows[0].created_by != userId){
        return res.status(403).json({message: "Forbidden"});
    }

    try{
        const delQuery = await poolClient.query("delete from documents where id = $1 and workspace_id = $2", [docId, workspaceId]);
        if(delQuery.rowCount == 0){
            return res.status(404).json({message: "Document not found"});
        }
        console.log("Successful document deletion with docId: "+docId+" for orgId: "+orgId+" by userId: "+userId+" with role: "+orgRole);
        return res.status(200).json({message: "Document deleted successfully"});
    }catch(err){
        if(err instanceof DatabaseError && err.code == "23503"){
            return res.status(400).json({message: "Document has sub files, cannot be deleted"});
        }
        console.log("Error occured in document deletion. "+err);
        return res.status(500).json({message: "Some error occured"});
    }   
}

export const fetchDocuments = async(req: Request, res: Response) => {
    // Auth required to scope results by org.
    if(!req.user){
        return res.status(401).json({message: "Invalid user data in request"});
    }
    const {orgId} = req.user;
    const {workspaceId, parentId} = req.params;
    if(!Number.isInteger(Number(workspaceId)) || Number(workspaceId) <= 0){
        return res.status(400).json({message: "Invalid workspace id entered"});
    }

    const paramsWorkspaceId = Number(workspaceId);
    const paramsParentId = !Number.isInteger(Number(parentId)) ? null : Number(parentId); 

    try{
        if(paramsParentId == null){
            // Root-level documents for the workspace.
            const docQuery = await poolClient.query("select * from documents where workspace_id = $1 and parent_id is null and org_id = $2", [paramsWorkspaceId, orgId]);
            return res.status(200).json({message: "Documents fetched successfully", data: docQuery.rows});
        }
        // Children of a specific parent document.
        const docQuery = await poolClient.query("select * from documents where workspace_id = $1 and parent_id = $2 and org_id = $3", [paramsWorkspaceId, paramsParentId, orgId]);
        return res.status(200).json({message: "Documents fetched successfully", data: docQuery.rows});
    }catch(err){
        console.log("Error occured in fetching documents. "+err);
        return res.status(500).json({message: "Some error occured"});
    }   
}

export const updateDocument = async(req: Request<updateDocParamsInterface, {}, updateDocInterface>, res:Response) => {
    // Auth required to enforce org and ownership checks.
    if(!req.user){
        return res.status(401).json({message: "Invalid user data in request"});
    }
    const {userId, orgId, orgRole} = req.user;
    const {workspaceId, parentId, docId} = req.params;
    if(!Number.isInteger(Number(workspaceId)) || !Number.isInteger(Number(docId))){
        return res.status(400).json({message: "Invalid workspace or document id entered"});
    }
    const numWorkspaceId = Number(workspaceId);
    const numParentId = !Number.isInteger(Number(parentId)) ? null : Number(parentId);
    const numDocumentId = Number(docId);

    const parsedData = updateDocSchema.safeParse(req.body);
    if(!parsedData.success){
        return res.status(400).json({message: "Invalid inputs", error: parsedData.error.message});
    }

    let {name, title, content} = parsedData.data;

    // Validate document ownership for members.
    const userCheck = await poolClient.query("select created_by from documents where id = $1 and org_id = $2 and workspace_id = $3", [numDocumentId, orgId, numWorkspaceId]);
    if(userCheck.rowCount == 0){
        return res.status(404).json({message: "Document not found"});
    }

    if(orgRole == Roles.MEMBER && userCheck.rows[0].created_by != userId){
        return res.status(403).json({message: "Forbidden"});
    }
    
    try{
        const updates = [];
        const values = [];
        let index = 1;

        // Build a partial update based on provided fields.
        if (name !== undefined) {
        updates.push(`name = $${index++}`);
        values.push(name);
        }
        if (title !== undefined) {
        updates.push(`title = $${index++}`);
        values.push(title);
        }
        if (content !== undefined) {
        updates.push(`content = $${index++}`);
        values.push(content);
        }

        if (updates.length === 0) {
        return res.status(400).json({ message: "No fields provided" });
        }

        values.push(numDocumentId, numWorkspaceId, orgId);

        const query = `update documents set ${updates.join(", ")}, updated_at = now() where id = $${index++} and workspace_id = $${index++} and org_id = $${index} and deleted_at is null returning *`;

        const updateQuery = await poolClient.query(query, values);
        if(updateQuery.rowCount == 0){
            return res.status(404).json({message: "Document not found or no changes made"});
        }
        console.log("Successful document update with docId: "+docId+" for orgId: "+orgId+" by userId: "+userId+" with role: "+orgRole);
        return res.status(200).json({message: "Document updated successfully", data: updateQuery.rows[0]});

    }catch(err){
        if(err instanceof DatabaseError && err.code == "23505"){
            return res.status(409).json({message: "Document name already exists"});
        }
        if(err instanceof DatabaseError && err.code == "23503"){
            return res.status(400).json({message: "Invalid ancestorId"});
        }
        console.log("Error occured in document update. "+err);
        return res.status(500).json({message: "Some error occured"});
    }
}