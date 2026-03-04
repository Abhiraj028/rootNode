import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, ServerError } from "../../shared/errors";
import { createOrgSchema, createOrgServiceInterface, updateOrgSchema, updateOrgServiceInterface } from "./orgInterfaces";
import { poolClient } from "../../db";
import { DatabaseError } from "pg";
import Roles from "../../shared/enum";

export async function createOrgService(props: createOrgServiceInterface){
    const { userId, createBody } = props;
    const parsedResult = createOrgSchema.safeParse(createBody);
    if(!parsedResult.success){
        throw new BadRequestError("Invalid inputs " + parsedResult.error.message);
    }

    const {name, slug} = parsedResult.data;
    
    const localClient = await poolClient.connect();
    try{
        await localClient.query("begin");
        const orgQuery = await localClient.query("insert into organizations(name, slug, created_by) values($1, $2, $3) returning * ", [name, slug, userId]);
        const membershipQuery = await localClient.query("insert into memberships(org_id, user_id, role) values($1, $2, $3) returning *", [orgQuery.rows[0].id, userId, Roles.ADMIN]);
        await localClient.query("commit");

        const data = {
            orgDetails: orgQuery.rows[0],
            membershipDetails: membershipQuery.rows[0]
        }

        return data;
    
    }catch(err){
        await localClient.query("rollback");
        if(err instanceof DatabaseError && err.code === "23505"){
            throw new ConflictError("Organization with the same name or slug already exists");
        }
        console.log("Error occured in the organization creation", err);
        throw new ServerError("Internal server error");
    }finally{
        localClient.release();
    }    
}

export async function fetchOrgService(userId: number){
    try{
        const resQuery = await poolClient.query("select o.id, o.name, o.slug, m.role from organizations o join memberships m on o.id = m.org_id where m.user_id = $1 and m.deleted_at is null and o.deleted_at is null",[userId]);
        return resQuery.rows;
    }catch(err){
        console.log("Error occured in fetching organizations for user: ", userId, " error: ", err);
        throw new ServerError("Internal server error");
    } 
}

export async function deleteOrgService(userId: number, orgId: number, orgRole: string){
    if(orgRole != Roles.ADMIN){
        throw new ForbiddenError("Forbidden access");
    }
    try{
        const delQuery = await poolClient.query("update organizations set deleted_by = $1, deleted_at = now() where id = $2 and deleted_at is null returning *", [userId, orgId]);
        if(delQuery.rowCount == 0){
            throw new NotFoundError("Organization not found");
        }
        return delQuery.rows[0];
    }catch(err){
        if(err instanceof AppError){
            console.log("Error occured in organization deletion", err);
            throw err;
        }
        console.log("Error occured in organization deletion", err);
        throw new ServerError("Internal server error");
    } 
}

export async function updateOrgService(props: updateOrgServiceInterface){
    const { userId, orgId, orgRole, updateBody } = props;

    const parsedResult = updateOrgSchema.safeParse(updateBody);
    if(!parsedResult.success){
        throw new BadRequestError("Invalid inputs " + parsedResult.error.message);
    }
    const {name, slug} = parsedResult.data;
  
    if(name == undefined && slug == undefined){
        throw new BadRequestError("At least one field (name or slug) must be provided for update");
    }

    if(orgRole != Roles.ADMIN){
        throw new ForbiddenError("Forbidden access");
    }

    try{
        const params = [];
        const values = [];
        let count = 1;

        if(name !== undefined){
            params.push(`name = $${count}`);
            values.push(name);
            count++;
        }
        if(slug !== undefined){
            params.push(`slug = $${count}`);
            values.push(slug);
            count++;
        }

        const setClause = params.join(", ");
        const query = `update organizations set ${setClause}, updated_at = now() where id = $${count} and deleted_at is null returning *`;
        values.push(orgId);

        const resQuery = await poolClient.query(query, values);
        if(resQuery.rowCount == 0){
            throw new NotFoundError("Organization not found");
        }

        return resQuery.rows[0];
    }catch(err){
        if(err instanceof AppError){
            console.log("Error occured in organization update", err);
            throw err;
        }
        if(err instanceof DatabaseError && err.code === "23505"){
            console.log("Organization with the same name or slug already exists for user: ", userId);
            throw new ConflictError("Organization with the same name or slug already exists");
        }
        console.log("Error occured in organization update", err);
        throw new ServerError("Internal server error");
    }
}