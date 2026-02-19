import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

export const AuthMiddleware = (req:Request,res:Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if(!authHeader || !authHeader.startsWith("Bearer ")){
        console.log("Invalid auth Header detected");
        return res.status(401).json({message:"Unauthorised"});
    }
    const headerToken = authHeader.split(" ")[1];
    if(!headerToken){
        return res.status(401).json({message: "Unauthorised"});
    }
    try{
        const verifyToken = jwt.verify(headerToken, process.env.JWT_SECRET!) as {
            sub: string
        };
        req.user = {
            sub: Number(verifyToken.sub)
        }
        next();
    }catch(err){
        console.log("invalid token");
        return res.status(401).json({message:"Invalid token"});
    }
}