import z from "zod";

export const MembershipDeleteSchema = z.object({
    memberUserId: z.number().positive()
});

export type MembershipDeleteInterface = z.infer<typeof MembershipDeleteSchema>;

export const MembershipUpdateRoleSchema = z.object({
    memberUserId: z.number().positive(),
    newRole: z.enum(["admin","lead","member"])
});
export type MembershipUpdateRoleInterface = z.infer<typeof MembershipUpdateRoleSchema>;

export const MembershipInviteSchema = MembershipUpdateRoleSchema;
export type MembershipInviteInterface = z.infer<typeof MembershipInviteSchema>;

export interface deleteMembershipServiceInterface {
    userId: number;
    orgId: number;
    orgRole: string;
    updateBody: MembershipDeleteInterface;
}

export interface inviteMembershipServiceInterface {
    userId: number;
    orgId: number;
    orgRole: string;
    inviteBody: MembershipInviteInterface;
}

export interface updateMembershipServiceInterface {
    userId: number;
    orgId: number;
    orgRole: string;
    updateBody: MembershipUpdateRoleInterface;
}