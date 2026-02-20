import z from "zod";

export const workspaceCreationSchema = z.object({
    name: z.string().max(100, "Workspace name should be less than 100 characters").trim()
});

export type workspaceCreationInterface = z.infer<typeof workspaceCreationSchema>;

