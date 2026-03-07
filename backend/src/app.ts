import express, { Express } from "express";
import { poolClient } from "./db";
import authRoutes from "./modules/auth/auth.routes";
import orgRoutes from "./modules/organizations/organizations.routes"
import workspaceRoutes from "./modules/workspaces/workspace.routes";
import documentRoutes from "./modules/documents/documents.routes";
import membershipRoutes from "./modules/memberships/memberships.routes";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import cors from "cors";
import { errorMiddleware } from "./middlewares/errorMiddleware";

dotenv.config();

export const app: Express = express();

app.use(express.json());
app.use(cookieParser());
app.use(
	cors({
		origin: "http://localhost:5173",
		credentials: true,
	})
);

app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/org", orgRoutes);
app.use("/api/v1/workspace", workspaceRoutes);
app.use("/api/v1/document", documentRoutes);
app.use("/api/v1/membership", membershipRoutes);
app.use(errorMiddleware);
