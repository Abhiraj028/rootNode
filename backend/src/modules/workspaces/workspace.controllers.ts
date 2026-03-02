import { Request, Response } from "express";
import { workspaceCreationInterface, workspaceCreationSchema, workspaceDeleteParamsInterface, workspaceUpdateInterface, workspaceUpdateParamsInterface, workspaceUpdateSchema } from "./workspace.interfaces";
import { checkWorkspaceMainRole, checkWorkspaceUpdateRole, createWorkspaceService, deleteWorkspaceService, fetchWorkspaceService } from "./workspace.services";
import { nameCheckWorkspaceCreate, updateWorkspaceService, workspaceIdCheck } from "./workspace.services";
import { reqCheck } from "../../shared/services";
import { AppError } from "../../shared/errors";

export const createWorkspace = async (req: Request<{}, {}, workspaceCreationInterface>, res: Response) => {
    try {
        const { userId, orgId, orgRole } = reqCheck(req.user);
        checkWorkspaceMainRole(orgRole);

        const parsedBody =  workspaceCreationSchema.safeParse(req.body);
        if(!parsedBody.success){
            return res.status(400).json({message: "Invalid inputs: "+parsedBody.error.message});
        }
            
        let workspaceName = nameCheckWorkspaceCreate(parsedBody.data.name);

        const workspaceRes = await createWorkspaceService(workspaceName, orgId, userId);
        console.log("Workspace created successfully with name: "+workspaceName+" for orgId: "+orgId+ " by userId: "+userId+" workspaceId: "+workspaceRes.rows[0].id);

        return res.status(201).json({ message: "Workspace created successfully", data: { name: workspaceName, workspaceId: workspaceRes.rows[0].id } });

    } catch (err) {
        console.log("Error in create workspace controller", err);
        if(err instanceof AppError){
            return res.status(err.status).json({message: err.message});
        }

        console.log("Unknown error in create workspace controller", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const fetchWorkspace = async (req: Request, res: Response) => {
    try {
        const { userId, orgId } = reqCheck(req.user);

        const workspaceQuery = await fetchWorkspaceService(orgId);
        console.log("Workspaces fetched successfully for orgId: "+orgId+" by userId: "+userId);

        return res.status(200).json({ message: "Workspaces fetched successfully", data: workspaceQuery.rows });

    } catch (err) {
        console.log("Error in fetch workspace controller", err);
        if(err instanceof AppError){
            return res.status(err.status).json({message: err.message});
        }

        console.log("Unknown error in fetch workspace controller", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const deleteWorkspace = async (req: Request<workspaceDeleteParamsInterface>, res: Response) => {
    try {
        const { userId, orgId, orgRole } = reqCheck(req.user);
        checkWorkspaceMainRole(orgRole);

        const workspaceId = workspaceIdCheck(req.params.workspaceId);

        await deleteWorkspaceService(workspaceId, orgId, userId);
        console.log("Workspace deleted successfully with id: "+workspaceId+" by userId: "+userId);

        return res.status(200).json({ message: "Workspace deleted successfully" });
    } catch (err) {
        console.log("Error in delete workspace controller", err);
        if(err instanceof AppError){
            return res.status(err.status).json({message: err.message});
        }

        console.log("Unknown error in delete workspace controller", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};

export const updateWorkspace = async (req: Request<workspaceUpdateParamsInterface, {}, workspaceUpdateInterface>, res: Response) => {
    try {
        const { orgId, orgRole } = reqCheck(req.user);
        checkWorkspaceUpdateRole(orgRole);

        const workspaceId = workspaceIdCheck(req.params.workspaceId);

        const parsedData = workspaceUpdateSchema.safeParse(req.body);
            if(!parsedData.success){
                return res.status(400).json({message: "Invalid inputs: "+parsedData.error.message});
            }
        const workspaceName = parsedData.data.name;

        await updateWorkspaceService(workspaceId, workspaceName, orgId);
        console.log("Workspace updated successfully with id: "+workspaceId+" for orgId: "+orgId);

        return res.status(200).json({ message: "Workspace updated successfully" , data: { workspaceId, name: workspaceName }});
    } catch (err) {
        console.log("Error in update workspace controller", err);
        if(err instanceof AppError){
            return res.status(err.status).json({message: err.message});
        }

        console.log("Unknown error in update workspace controller", err);
        return res.status(500).json({ message: "Internal server error" });
    }
};