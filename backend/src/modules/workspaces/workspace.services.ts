import Roles from "../../shared/enum";
import crypto from "crypto";
import { poolClient } from "../../db";
import { DatabaseError } from "pg";
import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, ServerError } from "../../shared/errors";
import { workspaceCreateServiceInterface, workspaceCreationSchema } from "./workspace.interfaces";
import { workspaceDeleteServiceInterface, workspaceUpdateSchema, workspaceUpdateServiceInterface } from "./workspace.interfaces";

export async function createWorkspaceService(props: workspaceCreateServiceInterface){
    const { userId, orgId, orgRole, createBody } = props;

    workspaceRoleCheck(orgRole);

    const parsedBody = workspaceCreationSchema.safeParse(createBody);
    if(!parsedBody.success){
        throw new BadRequestError("Invalid inputs: "+parsedBody.error.message);
    }

    let { name } = parsedBody.data;
    if(name.length == 0){
        name = "Default Workspace"+crypto.randomBytes(4).toString("hex");
    }
    
    try{
        const workspaceRes = await poolClient.query("insert into workspaces(name, org_id, created_by) values($1,$2,$3) returning *",[name, orgId, userId]);
        return workspaceRes.rows[0];
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            throw new ConflictError("Workspace with the same name already exists");
        }
        throw err;
    }    
}

export async function fetchWorkspaceService(orgId: number){
    const workspaceQuery = await poolClient.query("select id, name from workspaces where org_id = $1 and deleted_at is null", [orgId]);
    return workspaceQuery.rows;
}

export async function updateWorkspaceService(props: workspaceUpdateServiceInterface){
    
    const { orgId, orgRole, updateBody } = props;
    const givenId = props.workspaceId;

    workspaceRoleCheck(orgRole);

    const workspaceId = Number(givenId);
    if(isNaN(workspaceId) || workspaceId <= 0){
        throw new BadRequestError("Invalid workspaceId");
    }

    const parsedBody = workspaceUpdateSchema.safeParse(updateBody);
    if(!parsedBody.success){
        throw new BadRequestError("Invalid inputs: "+parsedBody.error.message);
    }
    const { name } = parsedBody.data;

    try{
        const updateWorkspaceQuery = await poolClient.query("update workspaces set name = $1, updated_at = now() where id = $2 and org_id = $3 and deleted_at is null returning *", [name, workspaceId, orgId]);
        if(updateWorkspaceQuery.rowCount == 0){
            throw new NotFoundError("Workspace not found");
        }
        return updateWorkspaceQuery.rows[0];

    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            throw new ConflictError("Workspace with the same name already exists");
        }
        throw err;
    }    
}

export async function deleteWorkspaceService(props: workspaceDeleteServiceInterface){
    const { userId, orgId, orgRole } = props;
    const givenId = props.workspaceId;
    
    workspaceRoleCheck(orgRole);

    const workspaceId = Number(givenId);
    if(isNaN(workspaceId) || workspaceId <= 0){
        throw new BadRequestError("Invalid workspaceId");
    }

    try{
        const deleteQuery = await poolClient.query("update workspaces set deleted_at = now(), deleted_by = $1 where id = $2 and org_id = $3 and deleted_at is null returning *", [userId, workspaceId, orgId]);
        if(deleteQuery.rowCount == 0){
            throw new NotFoundError("Workspace not found");
        }
        return deleteQuery.rows[0];
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23503"){
            throw new ConflictError("Cannot delete workspace with dependent records");
        }
        throw err;
    }   
}

function workspaceRoleCheck(role: string){
    if(role != Roles.ADMIN){
        throw new ForbiddenError("Forbidden access");
    }
}