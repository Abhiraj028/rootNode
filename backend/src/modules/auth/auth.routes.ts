import {Router} from "express";
import dotenv from "dotenv";
import { logIn, logOut, refreshCall, signUp } from "./auth.controller";

dotenv.config();
const router = Router();

router.post("/signup", signUp);

router.post("/login", logIn);

router.post("/refresh", refreshCall);

router.delete("/logout", logOut);

export default router;