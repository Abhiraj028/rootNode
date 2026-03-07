import { Request, Response } from "express";
import { poolClient } from "../../db";
import { SignUpRequest, SignUpRequestSchema, LoginRequest, LoginRequestSchema } from "./authInterfaces";
import { DatabaseError } from "pg";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { logInService, logOutService, refreshCallService, signUpService } from "./auth.services";

dotenv.config();


export const signUp = async (req: Request<{}, {}, SignUpRequest>, res: Response) => {
    const signUpBody = req.body;

    const signUpServiceCall = await signUpService(signUpBody);
    
    return res.status(201).json({message: "User created Successfully", data: signUpServiceCall});
}

export const logIn = async (req: Request<{}, {}, LoginRequest>, res: Response) => {
    const loginBody = req.body;

    const logInServiceCall = await logInService(loginBody);
    const {sampleRefresh , accessToken } = logInServiceCall;

    res.cookie("refreshToken", sampleRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    return res.status(200).json({message: "logged in successfully", data: {token: accessToken}});
}

export const refreshCall = async(req:Request, res:Response) => {
    const fetchedToken = req.cookies.refreshToken;

    const refreshCallServiceCall = await refreshCallService(fetchedToken);
    const {newSampleRefresh, newAccessToken} = refreshCallServiceCall;

    res.cookie("refreshToken", newSampleRefresh, {
        httpOnly: true,
        secure : process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000
    });

    return res.status(200).json({message: "Token refreshed successfully", data: {token: newAccessToken}});
}

export const logOut = async(req: Request, res:Response) => {
    const fetchedToken = req.cookies.refreshToken;

    await logOutService(fetchedToken);
    res.clearCookie("refreshToken");
 
    return res.status(200).json({message: "Logged out successfully"});
}