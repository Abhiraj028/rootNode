import Roles from "../../shared/enum";
import crypto from "crypto";
import { poolClient } from "../../db";
import { DatabaseError } from "pg";
import { AppError } from "../../shared/errors";


export function checkWorkspaceMainRole(orgRole: string){
    if(orgRole != Roles.ADMIN){
        throw new AppError("Forbidden access", 403);
    }
}

export function nameCheckWorkspaceCreate(name: string){
    if(name.length == 0){
        name = "Default Workspace"+crypto.randomBytes(4).toString("hex");
    }
    return name;
}

export function checkWorkspaceUpdateRole(orgRole: string){
    if(orgRole == Roles.MEMBER){
        throw new AppError("Forbidden access", 403);
    }
}

export function workspaceIdCheck(givenId: string){
    const workspaceId = Number(givenId);
    if(isNaN(workspaceId) || workspaceId <= 0){
        throw new AppError("Invalid workspaceId", 400);
    }
    return workspaceId;
}

export async function createWorkspaceService(workspaceName: string, orgId: number, userId: number){
    try{
        const workspaceRes = await poolClient.query("insert into workspaces(name, org_id, created_by) values($1,$2,$3) returning id",[workspaceName, orgId, userId]);
        return workspaceRes;
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            throw new AppError("Workspace with the same name already exists", 409);
        }
        throw new AppError("Internal server error", 500);
    }
}

export async function fetchWorkspaceService(orgId: number){
    const workspaceQuery = await poolClient.query("select id, name from workspaces where org_id = $1 and deleted_at is null", [orgId]);
    return workspaceQuery;
}

export async function updateWorkspaceService(workspaceId: number, workspaceName: string, orgId: number){
    try{
        const updateWorkspaceQuery = await poolClient.query("update workspaces set name = $1, updated_at = now() where id = $2 and org_id = $3 and deleted_at is null returning id", [workspaceName, workspaceId, orgId]);
        if(updateWorkspaceQuery.rowCount == 0){
            throw new AppError("Workspace not found", 404);
        }
        return updateWorkspaceQuery;

    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            throw new AppError("Workspace with the same name already exists", 409);
        }
        throw new AppError("Internal server error", 500);
    }    
}

export async function deleteWorkspaceService(workspaceId: number, orgId: number, userId: number){
    try{
        const deleteQuery = await poolClient.query("update workspaces set deleted_at = now(), deleted_by = $1 where id = $2 and org_id = $3 and deleted_at is null returning id", [userId, workspaceId, orgId]);
        if(deleteQuery.rowCount == 0){
            throw new AppError("Workspace not found", 404);
        }
        return deleteQuery;
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23503"){
            throw new AppError("Cannot delete workspace with dependent records", 400);
        }
        throw new AppError("Internal server error", 500);
    }   
}