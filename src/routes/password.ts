import { Router, Response } from "express";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import {
  changePassword,
  getPasswordStrengthInfo,
  getDefaultPolicy,
} from "../services/passwordService";
import { validatePasswordComplexity, checkPasswordStrength } from "../utils/password";
import { completeRotationTask } from "../services/rotationService";
import { PasswordHistory } from "../entities/PasswordHistory";
import { AppDataSource } from "../data-source";

const router = Router();

router.use(authMiddleware);

router.post("/change", async (req: AuthRequest, res: Response) => {
  try {
    const { oldPassword, newPassword, taskId } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "请输入原密码和新密码" });
    }

    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.ip || "";
    const result = await changePassword(req.userId!, oldPassword, newPassword, ipAddress);

    if (!result.success) {
      return res.status(400).json({
        message: result.message,
        errors: result.errors,
      });
    }

    if (taskId) {
      await completeRotationTask(taskId, req.userId!);
    }

    res.json({ message: result.message });
  } catch (error) {
    res.status(500).json({ message: "修改密码失败", error: (error as Error).message });
  }
});

router.post("/validate", async (req: AuthRequest, res: Response) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ message: "请输入密码" });
    }

    const policy = await getDefaultPolicy();
    const complexityResult = validatePasswordComplexity(password, {
      minLength: policy.minLength,
      requireUppercase: policy.requireUppercase,
      requireLowercase: policy.requireLowercase,
      requireNumber: policy.requireNumber,
      requireSpecialChar: policy.requireSpecialChar,
    });

    const strengthResult = checkPasswordStrength(password);

    res.json({
      valid: complexityResult.valid,
      complexityErrors: complexityResult.errors,
      strength: {
        score: strengthResult.score,
        level: strengthResult.strength,
        suggestions: strengthResult.suggestions,
        isWeak: strengthResult.isWeak,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "验证失败", error: (error as Error).message });
  }
});

router.get("/strength", async (req: AuthRequest, res: Response) => {
  try {
    const info = await getPasswordStrengthInfo(req.userId!);
    if (!info) {
      return res.status(404).json({ message: "用户不存在" });
    }
    res.json(info);
  } catch (error) {
    res.status(500).json({ message: "获取密码强度失败", error: (error as Error).message });
  }
});

router.get("/history", async (req: AuthRequest, res: Response) => {
  try {
    const historyRepo = AppDataSource.getRepository(PasswordHistory);
    const history = await historyRepo.find({
      where: { userId: req.userId },
      order: { createdAt: "DESC" },
      take: 10,
    });

    res.json({
      history: history.map((h) => ({
        id: h.id,
        strengthScore: h.strengthScore,
        createdAt: h.createdAt,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "获取历史记录失败", error: (error as Error).message });
  }
});

router.get("/policy", async (req: AuthRequest, res: Response) => {
  try {
    const policy = await getDefaultPolicy();
    res.json({ policy });
  } catch (error) {
    res.status(500).json({ message: "获取策略失败", error: (error as Error).message });
  }
});

export default router;
