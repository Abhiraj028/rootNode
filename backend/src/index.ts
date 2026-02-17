import express, { Express, Request, Response } from "express";
import { DatabaseError } from "pg";
import { poolClient } from "./db";
import bcrypt from "bcrypt";
import { SignUpRequest, SignUpRequestSchema, LoginRequest, LoginRequestSchema } from "./authInterfaces";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import cookieParser from "cookie-parser";

dotenv.config();
const app: Express = express();

app.use(express.json());
app.use(cookieParser());

app.post("/api/v1/signup",async (req: Request<{}, {}, SignUpRequest>, res: Response) => {
    const parseResult = SignUpRequestSchema.safeParse(req.body);
    if(!parseResult.success){
        console.log("Validation failed for signup request", parseResult.error);
        return res.status(400).json({message: "Invalid inputs", errors: parseResult.error.message});
    }
    const {name, email, password} = parseResult.data;
    const hashedPassword = await bcrypt.hash(password, 10);
    try{
        const result = await poolClient.query("Insert into users(name,email,password_hash) values($1,$2,$3) returning id",[name,email.toLowerCase(),hashedPassword]);
        const user = result.rows[0];
        console.log("User created successfully", user);
        return res.status(201).json({message: "User created Successfully", user});
    }catch(err){
        if(err instanceof DatabaseError && err.code === "23505"){
            console.error("Email already exists", err);
            return res.status(409).json({message: "Email already exists"});
        }
        console.error("Error creating user", err);
        return res.status(500).json({message: "Internal Server Error"});
    }
});

app.post("/api/v1/login",async (req: Request<{}, {}, LoginRequest>, res: Response) => {
    try{
        const parsedBody = LoginRequestSchema.safeParse(req.body);
        if(!parsedBody.success){
            console.log("Validation failed for login request", parsedBody.error);
            return res.status(400).json({message: parsedBody.error.message});
        }

        const userCheck = await poolClient.query("select * from users where email = $1", [parsedBody.data.email.toLowerCase()]);
        if(userCheck.rowCount == 0){
            console.log("No user found with email", parsedBody.data.email);
            return res.status(400).json({message: "Invalid credentials entered" });
        }

        const user = userCheck.rows[0];
        const passwordCheck = await bcrypt.compare(parsedBody.data.password, user.password_hash);
        if(!passwordCheck){
            console.log("password mismatch for user: ", parsedBody.data.email);
            return res.status(400).json({message: "Invalid credentials entered"});
        }

        const accessToken = jwt.sign({sub: user.id as string} , process.env.JWT_SECRET!, {expiresIn: "15m"});
        const sampleRefresh = crypto.randomBytes(64).toString("hex");
        const refreshToken = crypto.createHash("sha256").update(sampleRefresh).digest("hex");
        console.log("User has logged in successfully", user);

        const tokenSet = await poolClient.query("insert into token_table(user_id, token_hash, expires_at) values($1,$2,$3) returning id",[user.id,refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
        console.log("Token stored for the user with token id: ", tokenSet.rows[0].id);

        res.cookie("refreshToken", sampleRefresh, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 
        });

        return res.status(200).json({message: "logged in successfully", token: accessToken});
    }catch(err){
        console.log("Error in login route",err);
        return res.status(500).json({message: "Internal Server Error"});
    }
});

app.post("/api/v1/refresh", async(req:Request, res:Response) => {
    const fetchedToken = req.cookies.refreshToken;
    if(!fetchedToken){
        console.log("No refresh token was provided in the request");
        return res.status(401).json({message: "Unauthorized"});
    }
    const hashedToken = crypto.createHash("sha256").update(fetchedToken).digest("hex");
    const queryClient = await poolClient.connect();

    try{
        await queryClient.query("begin");

        const tokenCheck = await queryClient.query("select * from token_table where token_hash = $1 and expires_at > now() for update",[hashedToken]);
        if(tokenCheck.rowCount == 0){
            console.log("No matching refresh token found in the database");
            await queryClient.query("rollback");
            return res.status(401).json({message: "Unauthorized, login again."});
        }
        const userFetched = tokenCheck.rows[0];
        if(userFetched.revoked_at != null){
            console.log("Possible inflitration detected. Revoked Refresh Token found for user id: ", userFetched.user_id);
            await queryClient.query("update token_table set revoked_at = now() where user_id = $1",[userFetched.user_id]);
            await queryClient.query("commit");
            return res.status(401).json({message: "Unauthorized"});
        }

        const newAccessToken = jwt.sign({sub: userFetched.user_id as string}, process.env.JWT_SECRET!, {expiresIn: "15m"});
        const newSampleRefresh = crypto.randomBytes(64).toString("hex");
        const newRefreshToken = crypto.createHash("sha256").update(newSampleRefresh).digest("hex");

        await queryClient.query("update token_table set revoked_at = now() where id = $1 returning user_id",[userFetched.id]);
        const insertedUser = await queryClient.query("insert into token_table(user_id, token_hash, expires_at) values($1,$2,$3) returning user_id",[userFetched.user_id, newRefreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
        
        await queryClient.query("commit");

        console.log("old token revoked and new refresh token stored for the user id: ", insertedUser.rows[0].user_id);

        res.cookie("refreshToken", newSampleRefresh, {
            httpOnly: true,
            secure : process.env.NODE_ENV === "production",
            sameSite: "strict",
            maxAge: 7 * 24 * 60 * 60 * 1000
        });

        return res.status(200).json({message: "Token refreshed successfully", token: newAccessToken});
    
    }catch(err){
        await queryClient.query("rollback");
        console.error("Error during token refresh", err);
        return res.status(500).json({message: "Internal Server Error"});
    }
    finally{
        queryClient.release();
    }
});








const run = async() => {
    try{
        await poolClient.connect();
        console.log("Connected to PostgreSQL database");
        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    }catch(err){
        console.error(err);
    }
}
run();