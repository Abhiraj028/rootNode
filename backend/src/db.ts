import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

export const poolClient = new Pool({
    user: process.env.POSTGRES_USER,
    database: process.env.POSTGRES_DB,
    password: process.env.POSTGRES_PASSWORD,
    port: 5432,
    host: "localhost",
    max: 20,
});