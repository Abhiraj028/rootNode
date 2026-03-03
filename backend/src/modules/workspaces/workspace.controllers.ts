import { Request, Response } from "express";
import { workspaceCreationInterface, workspaceCreationSchema, workspaceDeleteParamsInterface, workspaceUpdateInterface, workspaceUpdateParamsInterface, workspaceUpdateSchema } from "./workspace.interfaces";
import { createWorkspaceService, deleteWorkspaceService, fetchWorkspaceService, updateWorkspaceService } from "./workspace.services";
import { reqCheck } from "../../shared/services";

export const createWorkspace = async (req: Request<{}, {}, workspaceCreationInterface>, res: Response) => {
    
    const { userId, orgId, orgRole } = reqCheck(req.user);
    const createBody = req.body;

    const workspaceCreateServiceCall = await createWorkspaceService({userId, orgId, orgRole, createBody});

    return res.status(201).json({ message: "Workspace created successfully", data: workspaceCreateServiceCall });
};

export const fetchWorkspace = async (req: Request, res: Response) => {

    const { orgId } = reqCheck(req.user);
    const fetchWorkspaceServiceCall = await fetchWorkspaceService(orgId);
    return res.status(200).json({ message: "Workspaces fetched successfully", data: fetchWorkspaceServiceCall });
};

export const deleteWorkspace = async (req: Request<workspaceDeleteParamsInterface>, res: Response) => {

    const { userId, orgId, orgRole } = reqCheck(req.user);
    const { workspaceId } = req.params;

    const deleteWorkspaceServiceCall = await deleteWorkspaceService({userId, orgId, orgRole, workspaceId}); 
    return res.status(200).json({ message: "Workspace deleted successfully" , data: deleteWorkspaceServiceCall});
};

export const updateWorkspace = async (req: Request<workspaceUpdateParamsInterface, {}, workspaceUpdateInterface>, res: Response) => {

    const { orgId, orgRole } = reqCheck(req.user);
    const workspaceId = req.params.workspaceId
    const updateBody = req.body;

    const updateWorkspaceServiceCall = await updateWorkspaceService({ orgId, orgRole, workspaceId, updateBody});

    return res.status(200).json({ message: "Workspace updated successfully" , data: updateWorkspaceServiceCall});
};