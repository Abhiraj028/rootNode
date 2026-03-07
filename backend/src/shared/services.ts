import { AppError } from "./errors";
import { userCheckInterface, userRequestInterface } from "./userRequestInterface";

export function reqCheck(user: any){
    if(!user || !user.userId || !user.orgId || !user.orgRole){
        throw new AppError("Unauthorised", 401);
    }
    return {userId: user.userId, orgId: user.orgId, orgRole: user.orgRole} as userRequestInterface;
}

export function userCheck(user: any){
    if(!user || !user.userId){
        throw new AppError("Unauthorised", 401);
    }
    return {userId: user.userId} as userCheckInterface;
}