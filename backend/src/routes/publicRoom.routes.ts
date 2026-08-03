import { Router } from "express";
import { searchRooms } from "../controllers/publicRoom.controller";

const router = Router();

router.get("/", searchRooms);

export default router;