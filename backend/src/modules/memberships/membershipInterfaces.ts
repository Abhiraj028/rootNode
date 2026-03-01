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
