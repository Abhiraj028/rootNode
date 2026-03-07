import { poolClient } from "../../db";
import Roles from "../../shared/enum";
import { DatabaseError } from "pg";
import { deleteMembershipServiceInterface, updateMembershipServiceInterface ,inviteMembershipServiceInterface , MembershipDeleteInterface } from "./membershipInterfaces";
import { MembershipDeleteSchema, MembershipInviteSchema, MembershipUpdateRoleSchema } from "./membershipInterfaces";
import { AppError, BadRequestError, ConflictError, ForbiddenError, NotFoundError, ServerError } from "../../shared/errors";


export async function fetchMembershipService(orgId: number){
    try{
        const resQuery = await poolClient.query("select u.id, u.name, u.email, m.role, m.id as membership_id from users u join memberships m on u.id = m.user_id where m.org_id = $1 and m.deleted_at is null and u.deleted_at is null",[orgId]);
        return resQuery.rows;
    }catch(err){
        console.log("Error fetching members: ", err);
        throw new ServerError("Internal Server Error");
    }
}

export async function deleteMembershipService(props: deleteMembershipServiceInterface){

    const { userId, orgId, orgRole, updateBody } = props;

    if(orgRole != Roles.ADMIN){
        throw new ForbiddenError("Forbidden access");
    }

    const parsedData = MembershipDeleteSchema.safeParse(updateBody);
    if(!parsedData.success){
        throw new BadRequestError("Invalid request data" +  parsedData.error.message);
    }

    const { memberUserId } = parsedData.data;
    const localClient = await poolClient.connect();
    try{
        await localClient.query("BEGIN");
        const userRoleCheckQuery = await localClient.query("select role from memberships where user_id = $1 and org_id = $2 and deleted_at is null", [memberUserId, orgId]);
        if(userRoleCheckQuery.rowCount == 0){
            throw new NotFoundError("Membership not found");
        }
        if(userRoleCheckQuery.rows[0].role == Roles.ADMIN){
            const adminCountQuery = await localClient.query("select count(*) from memberships where org_id = $1 and role = $2 and deleted_at is null", [orgId, Roles.ADMIN]);
            if(Number(adminCountQuery.rows[0].count) <= 1){
                throw new ForbiddenError("Organization must have at least one admin");
            }
        }
        
        const reqQuery = await localClient.query("update memberships set deleted_at = now() where user_id = $1 and org_id = $2 and deleted_at is null returning *",[memberUserId, orgId]);
        if(reqQuery.rowCount == 0){
            throw new NotFoundError("Membership not found or already deleted");
        }
        console.log(`Membership with id ${reqQuery.rows[0].id} marked as deleted by user ${userId} in org ${orgId}`);
        await localClient.query("COMMIT");
        return reqQuery.rows[0];
        
    }catch(err){
        await localClient.query("ROLLBACK");
        if(err instanceof AppError){
            console.log("Error deleting membership: ", err);
            throw err;
        }
        console.log("Error deleting membership: ", err);
        throw new ServerError("Internal Server Error");
    }finally{
        localClient.release();
    }
}

export async function inviteMembershipService(props: inviteMembershipServiceInterface){
    const { userId, orgId, orgRole, inviteBody } = props;

    if(orgRole != Roles.ADMIN){
        throw new ForbiddenError("Forbidden access");
    }

    const parsedData = MembershipInviteSchema.safeParse(inviteBody);
    if(!parsedData.success){
        throw new BadRequestError("Invalid request data" +  parsedData.error.message);
    }
    const {memberUserId, newRole} = parsedData.data;

    try{
        const resQuery = await poolClient.query("insert into memberships(org_id, user_id, role, invited_by, created_at) values($1,$2,$3,$4, now()) returning *", [orgId, memberUserId, newRole, userId]);
        console.log(`User ${memberUserId} invited as ${newRole} by user ${userId} in org ${orgId} with membership id ${resQuery.rows[0].id}`);
        return resQuery.rows[0];
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            console.log(`User ${memberUserId} is already a member of org ${orgId}`);
            throw new ConflictError("User is already a member of the organization");
        }
        console.log("Error inviting member: ", err);
        throw new ServerError("Internal Server Error");
    }       
}

export async function updateMembershipService(props: updateMembershipServiceInterface){
        const { userId, orgId, orgRole, updateBody } = props;
        if(orgRole != Roles.ADMIN){
            throw new ForbiddenError("Forbidden access");
        }

        const parsedData = MembershipUpdateRoleSchema.safeParse(updateBody);
        if(!parsedData.success){
            throw new BadRequestError("Invalid request data" +  parsedData.error.message);
        }
        const {memberUserId, newRole} = parsedData.data;
        try{
            if(newRole != Roles.ADMIN){
                const userRoleCheckQuery = await poolClient.query("select role from memberships where user_id = $1 and org_id = $2 and deleted_at is null", [memberUserId, orgId]);
                if(userRoleCheckQuery.rowCount == 0){
                    throw new NotFoundError("Membership not found");
                }
                if(userRoleCheckQuery.rows[0].role == Roles.ADMIN){
                    const adminCountQuery = await poolClient.query("select count(*) from memberships where org_id = $1 and role = $2 and deleted_at is null", [orgId, Roles.ADMIN]);
                    if(Number(adminCountQuery.rows[0].count) <= 1){
                        throw new ForbiddenError("Organization must have at least one admin");
                    }
                }
            }   
            const resQuery = await poolClient.query("update memberships set role = $1, updated_at = now() where user_id = $2 and org_id = $3 and deleted_at is null returning *", [newRole, memberUserId, orgId]);
            if(resQuery.rowCount == 0){
                throw new NotFoundError("Membership not found or already deleted");
            }
            console.log(`Membership with id ${resQuery.rows[0].id} role updated to ${newRole} by user ${userId} in org ${orgId}`);
            return resQuery.rows[0];
        }catch(err){
        console.log("Error updating member role: ", err);
        if(err instanceof AppError){
            throw err;
        }
        throw new ServerError("Internal Server Error");
    }    
}

