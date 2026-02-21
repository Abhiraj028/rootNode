import z from "zod";

export const createDocSchema = z.object({
    name: z.string().max(100, "Document name should be less than 100 characters").trim(),
    title: z.string().min(1, "Document title cannot be empty").max(100, "Document title should be less than 100 characters").trim(),
    content: z.string().min(1, "Document content cannot be empty").trim()
});

export type createDocInterface = z.infer<typeof createDocSchema>;

export type createDocParamsInterface = {
    parentId?: string;
    workspaceId?: string;
}

export type deleteDocParamsInterface = {
    docId: string;
    workspaceId: string;
}