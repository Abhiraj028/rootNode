import express, { Express, Request, Response } from "express";
import { Client, DatabaseError } from "pg";
import bcrypt from "bcrypt";
import { SignUpRequest, SignUpRequestSchema } from "./authInterfaces";
import dotenv from "dotenv";
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

app.post("/api/v1/login",(req: Request, res: Response) => {
    console.log("Atoooo");
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