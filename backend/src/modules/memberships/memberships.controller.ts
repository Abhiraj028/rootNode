import { Request, Response } from "express";
import { MembershipDeleteInterface, MembershipInviteInterface } from "./membershipInterfaces";
import { MembershipUpdateRoleInterface } from "./membershipInterfaces";
import { fetchMembershipService, deleteMembershipService, updateMembershipService , inviteMembershipService } from "./memberships.services";
import { reqCheck } from "../../shared/services";

export const fetchMembership = async(req: Request, res: Response) => {
    const { orgId } = reqCheck(req.user);
    
    const fetchMembershipServiceCall = await fetchMembershipService(orgId);
    
    return res.status(200).json({message: "Members fetched successfully", data: fetchMembershipServiceCall });
}

export const deleteMembership = async(req: Request<{}, {}, MembershipDeleteInterface>, res: Response) => {
    const { userId, orgId, orgRole } = reqCheck(req.user);
    const updateBody = req.body;
    
    const deleteMembershipServiceCall = await deleteMembershipService({ userId, orgId, orgRole, updateBody });

    return res.status(200).json({ message: "Member removed successfully" }); 
}

export const inviteMembership = async(req: Request<{}, {}, MembershipInviteInterface>, res: Response) => {
    const { userId, orgId, orgRole} = reqCheck(req.user);
    const inviteBody = req.body;

    const inviteMembershipServiceCall = await inviteMembershipService({userId, orgId, orgRole, inviteBody});

    return res.status(201).json({ message: "Member invited successfully", data: inviteMembershipServiceCall });
}

export const updateMembership = async (req: Request<{},{},MembershipUpdateRoleInterface>, res: Response) => {

        const {userId, orgId, orgRole} = reqCheck(req.user);
        const updateBody = req.body;

        const updateMembershipServiceCall = await updateMembershipService({ userId, orgId, orgRole, updateBody });

        return res.status(200).json({ message: "Member role updated successfully" , data: updateMembershipServiceCall });
}