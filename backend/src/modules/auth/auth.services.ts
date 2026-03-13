import { Request, Response } from "express";
import { poolClient } from "../../db";
import { SignUpRequest, SignUpRequestSchema, LoginRequest, LoginRequestSchema } from "./authInterfaces";
import { DatabaseError } from "pg";
import crypto from "crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";
import { AppError, BadRequestError, ConflictError, ServerError, UnauthorizedError } from "../../shared/errors";

dotenv.config();

export async function signUpService(signUpBody : SignUpRequest ){

    const parseResult = SignUpRequestSchema.safeParse(signUpBody);
    if(!parseResult.success){
        console.log("Validation failed for signup request", parseResult.error);
        throw new BadRequestError("Invalid inputs" + parseResult.error.message);
    }
    const {name, email, password} = parseResult.data;
    const hashedPassword = await bcrypt.hash(password, 10);
    try{
        const result = await poolClient.query("Insert into users(name,email,password_hash) values($1,$2,$3) returning name,email,id",[name,email.toLowerCase(),hashedPassword]);
        return result.rows[0];
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            console.error("Email already exists", err);
            throw new ConflictError("Email already exists");
        }
        if(err instanceof AppError){
            throw err;
        }
        console.error("Error creating user", err);
        throw new ServerError("Internal Server Error");
    } 
}


export async function logInService(loginBody : LoginRequest){
    
    const parsedBody = LoginRequestSchema.safeParse(loginBody);
    if(!parsedBody.success){
        console.log("Validation failed for login request", parsedBody.error);
        throw new BadRequestError("Invalid inputs" + parsedBody.error.message);
    }

    try{
        const userCheck = await poolClient.query("select * from users where email = $1 and deleted_at is null", [parsedBody.data.email.toLowerCase()]);
        if(userCheck.rowCount == 0){
            console.log("No user found with email", parsedBody.data.email);
            throw new BadRequestError("Invalid credentials entered");
        }

        const user = userCheck.rows[0];
        const passwordCheck = await bcrypt.compare(parsedBody.data.password, user.password_hash);
        if(!passwordCheck){
            console.log("password mismatch for user: ", parsedBody.data.email);
            throw new BadRequestError("Invalid credentials entered");
        }

        const accessToken = jwt.sign({sub: user.id as string} , process.env.JWT_SECRET!, {expiresIn: "15m"});
        const sampleRefresh = crypto.randomBytes(64).toString("hex");
        const refreshToken = crypto.createHash("sha256").update(sampleRefresh).digest("hex");
        console.log("User has logged in successfully", user.name);

        const tokenSet = await poolClient.query("insert into token_table(user_id, token_hash, expires_at) values($1,$2,$3) returning *",[user.id,refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
        console.log("Token stored for the user with token id: ", tokenSet.rows[0].id);

        return {accessToken, sampleRefresh};

    }catch(err){
        if(err instanceof AppError){
            throw err;
        }
        console.log("Error in login route",err);
        throw new ServerError("Internal Server Error");
    }
}

export async function refreshCallService(fetchedToken: string){
    if(!fetchedToken){
        console.log("No refresh token was provided in the request");
        throw new UnauthorizedError("Unauthorized");
    }
    const hashedToken = crypto.createHash("sha256").update(fetchedToken).digest("hex");
    const queryClient = await poolClient.connect();

    try{
        await queryClient.query("begin");

        const tokenCheck = await queryClient.query("select * from token_table where token_hash = $1 and expires_at > now() for update",[hashedToken]);
        if(tokenCheck.rowCount == 0){
            console.log("No matching refresh token found in the database");
            throw new UnauthorizedError("Unauthorized");
        }
        const userFetched = tokenCheck.rows[0];
        if(userFetched.revoked_at != null){
            console.log("Possible inflitration detected. Revoked Refresh Token found for user id: ", userFetched.user_id);
            await queryClient.query("update token_table set revoked_at = now() where user_id = $1",[userFetched.user_id]);
            await queryClient.query("commit");
            throw new ConflictError("invalid access detected");
        }

        const newAccessToken = jwt.sign({sub: userFetched.user_id as string}, process.env.JWT_SECRET!, {expiresIn: "15m"});
        const newSampleRefresh = crypto.randomBytes(64).toString("hex");
        const newRefreshToken = crypto.createHash("sha256").update(newSampleRefresh).digest("hex");

        await queryClient.query("update token_table set revoked_at = now() where id = $1 returning user_id",[userFetched.id]);
        const insertedUser = await queryClient.query("insert into token_table(user_id, token_hash, expires_at) values($1,$2,$3) returning user_id",[userFetched.user_id, newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
        
        await queryClient.query("commit");

        console.log("old token revoked and new refresh token stored for the user id: ", insertedUser.rows[0].user_id);

        return {newSampleRefresh, newAccessToken};
    
    }catch(err){
        if(err instanceof ConflictError){
            throw err;
        }
        await queryClient.query("rollback");
        if(err instanceof AppError){
            throw err;
        }
        console.error("Error during token refresh", err);
        throw new ServerError("Server Error occcured");
    }
    finally{
        queryClient.release();
    }
}



export async function logOutService(fetchedToken: string){
    if(!fetchedToken){
        console.log("No refresh token in the logout request");
        throw new BadRequestError("Bad request");
    }
    const hashedToken = crypto.createHash("sha256").update(fetchedToken).digest("hex");
    try{
        const result = await poolClient.query("update token_table set revoked_at = now() where token_hash = $1 returning user_id",[hashedToken]);

        if(result.rowCount == 0){
            console.log("No matching token found in the db for logout");
        }else{
            const userIdFetched = result.rows[0].user_id;
            console.log("User: ",userIdFetched," has logged out successfully");
        }
    }catch(err){
        if(err instanceof AppError){
            throw err;
        }
        console.log("Error during logout request", err);
        throw new ServerError("Server error occured");
    }  
}



