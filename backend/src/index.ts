import express, { Express } from "express";
import { poolClient } from "./db";
import authRoutes from "./routes/auth.routes";
import orgRoutes from "./routes/organizations.routes"
import workspaceRoutes from "./routes/workspace.routes";
import documentRoutes from "./routes/documents.routes";
import membershipRoutes from "./routes/memberships.routes";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
dotenv.config();

const app: Express = express();


app.use(express.json());
app.use(cookieParser());

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/org", orgRoutes);
app.use("/api/v1/workspace", workspaceRoutes);
app.use("/api/v1/document", documentRoutes);
app.use("/api/v1/membership", membershipRoutes);

const start = async() => {
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
start();