import { Router, Response } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import {
  importUsersFromCSV,
  importPolicyFromCSV,
  importWeakPasswords,
} from "../services/importService";
import * as fs from "fs";
import * as path from "path";

const router = Router();

router.use(authMiddleware);
router.use(requireRole("admin"));

router.post("/users", async (req: AuthRequest, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({ message: "文件不存在" });
    }

    const result = await importUsersFromCSV(filePath, req.userId!);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "导入失败", error: (error as Error).message });
  }
});

router.post("/systems", async (req: AuthRequest, res: Response) => {
  try {
    const { filePath } = req.body;

    if (!filePath || !fs.existsSync(filePath)) {
      return res.status(400).json({ message: "文件不存在" });
    }

    const result = await importPolicyFromCSV(filePath, req.userId!);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "导入失败", error: (error as Error).message });
  }
});

router.post("/weak-passwords", async (req: AuthRequest, res: Response) => {
  try {
    const { passwords } = req.body;

    if (!Array.isArray(passwords) || passwords.length === 0) {
      return res.status(400).json({ message: "请提供密码列表" });
    }

    const result = await importWeakPasswords(passwords, req.userId!);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "导入失败", error: (error as Error).message });
  }
});

export default router;
