import { Request, Response, NextFunction } from "express";
import { poolClient } from "../db";
import { BadRequestError, ForbiddenError, ServerError, UnauthorizedError } from "../shared/errors";


export const orgMiddleware = async (req: Request, res: Response, next: NextFunction)  => {
    try{
        const orgId = Number(req.params.orgId);
        if(isNaN(orgId)){
            throw new BadRequestError("Invalid organization id");           
        }
        if(!req.user){
            throw new UnauthorizedError("Unauthorised");
        }
        const userId = req.user.userId;

        const roleQuery = await poolClient.query("select role from memberships where org_id = $1 and user_id = $2", [orgId, req.user.userId])
        if(roleQuery.rowCount == 0){
            console.log("User with given org not found. UserId: "+req.user.userId+" orgId: "+orgId);
            throw new ForbiddenError("Forbidden access");
        }

        req.user.orgId = orgId;
        req.user.orgRole = roleQuery.rows[0].role;

        next();

    }catch(err){
        console.log("Error in organization middleware", err);
        throw new ServerError("Internal server error");
    }
};