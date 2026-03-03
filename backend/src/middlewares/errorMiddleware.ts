import { Request, Response, NextFunction } from "express";
import { AppError } from "../shared/errors";

export const errorMiddleware = (err: unknown, req: Request, res: Response, next: NextFunction) => {
    if(err instanceof AppError){
        console.log(err);
        return res.status(err.status).json({ message: err.message });
    }
    console.error("Unexpected error: ", err);
    return res.status(500).json({ message: "Internal Server Error" });
};