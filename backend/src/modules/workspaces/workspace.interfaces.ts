import z from "zod";
import Roles from "../../shared/enum";

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
export type workspaceFetchParamsInterface = z.infer<typeof workspaceDeleteParams>;
export type workspaceUpdateParamsInterface = z.infer<typeof workspaceDeleteParams>;

export interface workspaceCreateServiceInterface {
    userId : number;
    orgId : number;
    orgRole : string;
    createBody : workspaceCreationInterface;
}

export interface workspaceDeleteServiceInterface {
    userId : number;
    orgId : number;
    orgRole : string;
    workspaceId : string;
}

export interface workspaceUpdateServiceInterface {
    orgId : number;
    orgRole : string;
    workspaceId : string;
    updateBody : workspaceUpdateInterface;
}