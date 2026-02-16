import express, { Express, Request, Response } from "express";
import { Client, DatabaseError, Pool } from "pg";
import bcrypt from "bcrypt";
import { SignUpRequest, SignUpRequestSchema, LoginRequest, LoginRequestSchema } from "./authInterfaces";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import crypto from "crypto";

dotenv.config();

const dbString = process.env.PG_CONNECTION_STRING;
if(!dbString){
    console.log("PG_CONNECTION_STRING is not defined in .env");
}

const app: Express = express();
const client = new Client({
    connectionString: dbString
});

app.use(express.json());

app.post("/api/v1/signup",async (req: Request<{}, {}, SignUpRequest>, res: Response) => {
    const parseResult = SignUpRequestSchema.safeParse(req.body);
    if(!parseResult.success){
        console.log("Validation failed for signup request", parseResult.error);
        return res.status(400).json({message: "Invalid inputs", errors: parseResult.error.message});
    }
    const {name, email, password} = parseResult.data;
    const hashedPassword = await bcrypt.hash(password, 10);
    try{
        const result = await client.query("Insert into users(name,email,password_hash) values($1,$2,$3) returning id",[name,email.toLowerCase(),hashedPassword]);
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
    const parsedBody = LoginRequestSchema.safeParse(req.body);
    if(!parsedBody.success){
        console.log("Validation failed for login request", parsedBody.error);
        return res.status(400).json({message: parsedBody.error.message});
    }

    const userCheck = await client.query("select * from users where email = $1", [parsedBody.data.email.toLowerCase()]);
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

    try{
        const tokenSet = await client.query("insert into token_table(user_id, token_hash, expires_at) values($1,$2,$3) returning id",[user.id,refreshToken, new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)]);
        console.log("Token stored for the user with token id: ", tokenSet.rows[0].id);
    }catch(err){
        console.error("Error storing refresh token for user", err);
        return res.status(500).json({message: "Internal Server Error"});
    }

    res.cookie("refreshToken", sampleRefresh, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60 * 1000 
    });

    return res.status(200).json({message: "logged in successfully", token: accessToken});

});









const run = async() => {
    try{
        await client.connect();
        console.log("Connected to PostgreSQL database");
        app.listen(3000, () => {
            console.log("Server is running on port 3000");
        });
    }catch(err){
        console.error(err);
    }
}
run();