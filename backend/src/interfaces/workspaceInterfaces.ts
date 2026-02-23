import z from "zod";

export const workspaceCreationSchema = z.object({
    name: z.string().max(100, "Workspace name should be less than 100 characters").trim()
});
export type workspaceCreationInterface = z.infer<typeof workspaceCreationSchema>;

export const workspaceUpdateSchema = z.object({
    name: z.string().min(1, "Workspace name cannot be empty").max(100, "Workspace name should be less than 100 characters").trim()
});
export type workspaceUpdateInterface = z.infer<typeof workspaceUpdateSchema>;

export const workspaceDeleteParams = z.object({
    workspaceId : z.string().min(1, "Workspace ID is required")
});
export type workspaceDeleteParamsInterface = z.infer<typeof workspaceDeleteParams>;

export type workspaceUpdateParamsInterface = z.infer<typeof workspaceDeleteParams>;