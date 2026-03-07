import { Request, Response } from "express";
import { createDocInterface, createDocParamsInterface, deleteDocParamsInterface, updateDocInterface, updateDocParamsInterface, fetchDocParamsInterface } from "./documentInterfaces";
import { createDocService, updateDocService, fetchDocService, deleteDocService } from "./documents.services";
import { reqCheck } from "../../shared/services";

export const createDocument = async(req: Request<createDocParamsInterface,{}, createDocInterface>   , res: Response) => {
    const {userId, orgId} = reqCheck(req.user);

    const createBody = req.body;
    const workspaceId = req.params.workspaceId;
    const parentId = req.params.parentId;

    const createDocServiceCall = await createDocService({userId, orgId, createBody, parentId: parentId || "-1", workspaceId});
    return res.status(201).json({message: "Document created successfully", data: createDocServiceCall});
}

export const deleteDocument = async(req: Request<deleteDocParamsInterface>, res: Response) => {
    const { userId, orgId, orgRole } = reqCheck(req.user);
    const workspaceId = req.params.workspaceId;
    const docId = req.params.docId;

    const deleteDocServiceCall = await deleteDocService({userId, orgId, orgRole, workspaceId, docId});

    return res.status(200).json({message: "Document deleted successfully", data: deleteDocServiceCall});
}

export const fetchDocuments = async(req: Request<fetchDocParamsInterface>, res: Response) => {
    const {orgId} = reqCheck(req.user);
    const {workspaceId, parentId} = req.params;

    const fetchDocServiceCall = await fetchDocService({ orgId, workspaceId, parentId: parentId || "-1"});
    return res.status(200).json({message: "Documents fetched successfully", data: fetchDocServiceCall});

}

export const updateDocument = async(req: Request<updateDocParamsInterface, {}, updateDocInterface>, res:Response) => {
    const { userId, orgId, orgRole } = reqCheck(req.user);
    const {workspaceId, parentId, docId} = req.params;
    const updateBody = req.body;

    const updateDocServiceCall = await updateDocService({userId, orgId, orgRole, workspaceId, docId, parentId : parentId || "-1", updateBody});
    return res.status(200).json({message: "Document updated successfully", data: updateDocServiceCall});

}