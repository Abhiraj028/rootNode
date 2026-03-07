import {Router} from "express";
import dotenv from "dotenv";
import { errorHandler } from "../../shared/errorHandler";
import { logIn, logOut, refreshCall, signUp } from "./auth.controller";

dotenv.config();
const router = Router();

router.post("/signup", errorHandler(signUp));

router.post("/login", errorHandler(logIn));

router.post("/refresh", errorHandler(refreshCall));

router.delete("/logout", errorHandler(logOut));

export default router;