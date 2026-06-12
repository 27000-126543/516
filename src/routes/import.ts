import { Router, Response } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import {
  importUsersFromCSV,
  importPolicyFromCSV,
  importWeakPasswords,
} from "../services/importService";
import multer from "multer";

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

router.use(authMiddleware);
router.use(requireRole("admin"));

router.post("/users", upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "请上传CSV文件" });
    }

    const result = await importUsersFromCSV(req.file.buffer, req.userId!);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "导入失败", error: (error as Error).message });
  }
});

router.post("/systems", upload.single("file"), async (req: AuthRequest, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "请上传CSV文件" });
    }

    const result = await importPolicyFromCSV(req.file.buffer, req.userId!);
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
