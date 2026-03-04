import { Request, Response } from "express";
import { createOrgInterface, updateOrgInterface } from "./orgInterfaces";
import { reqCheck } from "../../shared/services";
import { createOrgService, deleteOrgService, fetchOrgService, updateOrgService } from "./organizations.services";

export const createOrganization = async(req:Request<{},{}, createOrgInterface>, res:Response) => {
    const { userId } = reqCheck(req.user);

    const createBody = req.body;
    const createOrgServiceCall = await createOrgService({userId, createBody});

    return res.status(201).json({message: "Organization created successfully", data: createOrgServiceCall});
}

export const fetchOrganization = async(req: Request, res: Response) => {
    const { userId } = reqCheck(req.user); 
    
    const fetchOrgServiceCall = await fetchOrgService(userId);

    return res.status(200).json({message: "Organizations fetched successfully", data: fetchOrgServiceCall});
}

export const deleteOrganization = async(req: Request, res: Response) => {
    const { userId, orgId, orgRole } = reqCheck(req.user);
    
    const deleteOrgServiceCall = await deleteOrgService(userId, orgId, orgRole);

    return res.status(200).json({message: "Organization deleted successfully", data: deleteOrgServiceCall});
}

export const updateOrganization = async(req: Request<{}, {}, updateOrgInterface>, res:Response) => {
    const { userId, orgId, orgRole } = reqCheck(req.user);
    
    const updateBody = req.body;
    const updateOrgServiceCall = await updateOrgService({userId, orgId, orgRole, updateBody});
    
    return res.status(200).json({message: "Organization updated successfully", data: updateOrgServiceCall});
}