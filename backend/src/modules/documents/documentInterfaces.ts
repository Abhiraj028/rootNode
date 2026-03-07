import z from "zod";

export const createDocSchema = z.object({
    name: z.string().max(100, "Document name should be less than 100 characters").trim(),
    title: z.string().min(1, "Document title cannot be empty").max(100, "Document title should be less than 100 characters").trim(),
    content: z.string().min(1, "Document content cannot be empty").trim()
});

export type createDocInterface = z.infer<typeof createDocSchema>;

export type createDocParamsInterface = {
    parentId?: string;
    workspaceId: string;
}

export type deleteDocParamsInterface = {
    docId: string;
    workspaceId: string;
}

export type updateDocParamsInterface = {
    docId: string;
    workspaceId: string;
    parentId? : string;
};

export type fetchDocParamsInterface = createDocParamsInterface;

export const updateDocSchema = z.object({
    name: z.string().min(1, "Document name cannot be empty").max(100, "Document name should be less than 100 characters").trim().optional(),
    title: z.string().min(1, "Document title cannot be empty").max(100, "Document title should be less than 100 characters").trim().optional(),
    content: z.string().min(1, "Document content cannot be empty").trim().optional()
});

export type updateDocInterface = z.infer<typeof updateDocSchema>;

export interface createDocServiceInterface {
    userId: number;
    orgId: number;
    parentId: string;
    workspaceId: string;
    createBody: createDocInterface;
}

export interface fetchDocServiceInterface {
    orgId: number;
    workspaceId: string;
    parentId: string;
}

export interface deleteDocInterface {
    userId: number;
    orgId: number;
    orgRole: string;
    workspaceId: string;
    docId: string;
}

export interface updateDocServiceInterface {
    userId: number;
    orgId: number;
    orgRole: string;
    workspaceId: string;
    docId: string;
    parentId: string;
    updateBody: updateDocInterface;
}