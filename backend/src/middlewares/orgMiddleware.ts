import { Request, Response, NextFunction } from "express";
import { poolClient } from "../db";


export const orgMiddleware = async (req: Request, res: Response, next: NextFunction)  => {
    try{
        const orgId = Number(req.params.orgId);
        if(isNaN(orgId)){
            return res.status(400).json({message: "Organization Id not provided"});            
        }
        if(!req.user){
            return res.status(401).json({message: "Unauthorised"});
        }
        const userId = req.user.userId;

        const roleQuery = await poolClient.query("select role from memberships where org_id = $1 and user_id = $2", [orgId, req.user.userId])
        if(roleQuery.rowCount == 0){
            console.log("User with given org not found. UserId: "+req.user.userId+" orgId: "+orgId);
            return res.status(403).json({message: "Forbidden access"});
        }

        req.user.orgId = orgId;
        req.user.orgRole = roleQuery.rows[0].role;

        next();

    }catch(err){
        console.log("Error in organization middleware", err);
        return res.status(500).json({message: "Internal server error"});
    }
};