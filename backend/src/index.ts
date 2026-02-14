import express, { Express, Request, Response } from "express";
import { Client } from "pg";
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

app.get("/",(req: Request, res: Response) => {
    console.log("Ayooo");
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