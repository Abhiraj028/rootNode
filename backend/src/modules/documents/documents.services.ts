import { updateDocServiceInterface, createDocSchema, createDocServiceInterface, deleteDocInterface, fetchDocServiceInterface, updateDocSchema } from "./documentInterfaces";
import { poolClient } from "../../db";
import crypto from "crypto";
import { DatabaseError } from "pg";
import Roles from "../../shared/enum";
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, ServerError } from "../../shared/errors";

export async function createDocService(props: createDocServiceInterface ){
    const { userId, orgId, createBody } = props;


    const workspaceId = Number(props.workspaceId);

    if(!Number.isInteger(workspaceId) || workspaceId <= 0){
        throw new BadRequestError("Invalid workspaceId");
    }

    const workspaceCheck = await poolClient.query("select org_id from workspaces where id = $1 and deleted_at is null",[workspaceId]);
    if(workspaceCheck.rowCount == 0 || workspaceCheck.rows[0].org_id != orgId){
        throw new ForbiddenError("Forbidden");
    }

    const parentId = props.parentId == "-1" ? null : Number(props.parentId);

    if(parentId != null && (!Number.isInteger(parentId) || parentId <= 0)){
        throw new BadRequestError("Invalid parentId");
    }

    if(parentId != null){
        const parentCheck = await poolClient.query("select org_id from documents where id = $1 and workspace_id = $2 and deleted_at is null", [parentId, workspaceId]);
        if(parentCheck.rowCount == 0 || parentCheck.rows[0].org_id != orgId){
            throw new ForbiddenError("Forbidden");
        }
    }

    const parsedData = createDocSchema.safeParse(createBody);
    if(!parsedData.success){
        throw new BadRequestError("Invalid inputs: "+parsedData.error.message);
    }    

    let { name, title, content } = parsedData.data;
    if(name == ""){
        name = "Untitled Document" + crypto.randomBytes(4).toString("hex");
    }

    try{
        const queryOut = await poolClient.query("insert into documents(name, title, content, org_id, created_by, parent_id, workspace_id) values($1,$2,$3,$4,$5,$6,$7) returning *", [name, title, content, orgId, userId, parentId, workspaceId]);
        return queryOut.rows[0];

    }catch(err){
        if(err instanceof DatabaseError && err.code == "23505"){
            throw new ConflictError("Document name already exists");
        }
        if(err instanceof DatabaseError && err.code == "23503"){
            throw new ConflictError("Invalid ancestorId");
        }
        console.log("Error occured in document creation. "+err);
        throw new ServerError("Some error occured");
    }

}

export async function deleteDocService(props: deleteDocInterface){
    const { userId, orgId, orgRole } = props;
    const workspaceId = Number(props.workspaceId);
    const docId = Number(props.docId);

    if(!Number.isInteger(workspaceId) || workspaceId <= 0){
        throw new BadRequestError("Invalid workspaceId");
    }

    if(!Number.isInteger(docId) || docId <= 0){
        throw new BadRequestError("Invalid document id");
    }

    const docCheck = await poolClient.query("select org_id, created_by from documents where id = $1 and workspace_id = $2 and org_id = $3 and deleted_at is null", [docId, workspaceId, orgId]);
    if(docCheck.rowCount == 0 || docCheck.rows[0].org_id != orgId){
       throw new ForbiddenError("Forbidden");
    }

    if(orgRole == Roles.MEMBER && docCheck.rows[0].created_by != userId){
        throw new ForbiddenError("Forbidden");
    }

    try{
        const delQuery = await poolClient.query("update documents set deleted_at = now() where id = $1 and workspace_id = $2 and deleted_at is null returning *", [docId, workspaceId]);
        if(delQuery.rowCount == 0){
            throw new NotFoundError("Document not found");
        }
        return delQuery.rows[0];
    }catch(err){
        if(err instanceof DatabaseError && err.code == "23503"){
            throw new ConflictError("Document has sub files, cannot be deleted");
        }
        console.log("Error occured in document deletion. "+err);
        throw new ServerError("Some error occured");
    }  
}

export async function fetchDocService(props: fetchDocServiceInterface){
    const { orgId } = props;

    const workspaceId = Number(props.workspaceId);
    const parentId = props.parentId == "-1" ? null : Number(props.parentId);

    if(!Number.isInteger(Number(workspaceId)) || Number(workspaceId) <= 0){
        throw new BadRequestError("Invalid workspace id entered");
    }

    if(parentId != null && (!Number.isInteger(parentId) || parentId <= 0)){
        throw new BadRequestError("Invalid parentId");
    }

    try{
        if(parentId == null){
            // Root-level documents for the workspace.
            const docQuery = await poolClient.query("select * from documents where workspace_id = $1 and parent_id is null and org_id = $2 and deleted_at is null ", [workspaceId, orgId]);
            return docQuery.rows;
        }
        // Children of a specific parent document.
        const docQuery = await poolClient.query("select * from documents where workspace_id = $1 and parent_id = $2 and org_id = $3 and deleted_at is null ", [workspaceId, parentId, orgId]);
        return docQuery.rows;
    }catch(err){
        console.log("Error occured in fetching documents. "+err);
        throw new ServerError("Some error occured");
    }  
}

export async function updateDocService(props: updateDocServiceInterface){
    const { userId, orgId, orgRole, updateBody } = props;
    const workspaceId = Number(props.workspaceId);
    const docId = Number(props.docId);
    const parentId = props.parentId == "-1" ? null : Number(props.parentId);

    if(!Number.isInteger(Number(workspaceId)) || !Number.isInteger(Number(docId) ) || workspaceId <= 0 || docId <= 0){
        throw new BadRequestError("Invalid workspace or document id entered");
    }

    const parsedData = updateDocSchema.safeParse(updateBody);
    if(!parsedData.success){
        throw new BadRequestError("Invalid inputs: "+parsedData.error.message);
    }

    let {name, title, content} = parsedData.data;

    const userCheck = await poolClient.query("select created_by from documents where id = $1 and org_id = $2 and workspace_id = $3 and deleted_at is null", [docId, orgId, workspaceId]);
    if(userCheck.rowCount == 0){
        throw new NotFoundError("Document not found");
    }

    if(orgRole == Roles.MEMBER && userCheck.rows[0].created_by != userId){
        throw new ForbiddenError("Forbidden");
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
            throw new BadRequestError(" No valid fields provided");
        }

        values.push(docId, workspaceId, orgId);

        const query = `update documents set ${updates.join(", ")}, updated_at = now() where id = $${index++} and workspace_id = $${index++} and org_id = $${index} and deleted_at is null returning *`;

        const updateQuery = await poolClient.query(query, values);
        if(updateQuery.rowCount == 0){
            throw new NotFoundError("Document not found or no changes made");
        }
        console.log("Successful document update with docId: "+docId+" for orgId: "+orgId+" by userId: "+userId+" with role: "+orgRole);
        return updateQuery.rows[0];

    }catch(err){
        if(err instanceof DatabaseError && err.code == "23505"){
            throw new ConflictError("Document name already exists");
        }
        if(err instanceof DatabaseError && err.code == "23503"){
            throw new ConflictError("Invalid ancestorId");
        }
        console.log("Error occured in document update. "+err);
        throw new ServerError("Some error occured");
    }

}


