import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { UnauthorizedError } from "../shared/errors";

export const AuthMiddleware = (req:Request,res:Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        console.log("Invalid auth Header detected");
        throw new UnauthorizedError("Unauthorised");
    }
    const headerToken = authHeader.split(" ")[1];
    if(!headerToken){
        throw new UnauthorizedError("Unauthorised");
    }
    try{
        const verifyToken = jwt.verify(headerToken, process.env.JWT_SECRET!) as {
            sub: string
        };

        if(!Number.isInteger(Number(verifyToken.sub)) || Number(verifyToken.sub) <= 0){
            console.log("Invalid token sub detected", verifyToken.sub);
            throw new UnauthorizedError("Unauthorised");
        }

        req.user = {
            userId: Number(verifyToken.sub)
        }
        next();
    }catch(err){
        console.log("invalid token");
        throw new UnauthorizedError("Unauthorised");
    }
}