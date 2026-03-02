import { AppError } from "./errors";
import { userRequestInterface } from "./userRequestInterface";

export function reqCheck(user: any){
    if(!user || !user.userId || !user.orgId || !user.orgRole){
        throw new AppError("Unauthorised", 401);
    }
    return {userId: user.userId, orgId: user.orgId, orgRole: user.orgRole} as userRequestInterface;
}