import { Router, Request, Response } from "express";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { comparePassword, generateToken } from "../utils/auth";
import { authMiddleware, AuthRequest } from "../middleware/auth";
import {
  detectAbnormalLogin,
  recordLoginLog,
  sendTwoFactorAuthCode,
  verifyTwoFactorCode,
} from "../services/loginService";
import { createAuditLog } from "../services/auditService";

const router = Router();

router.post("/login", async (req: Request, res: Response) => {
  try {
    const { username, password, systemId = 1 } = req.body;

    if (!username || !password) {
      return res.status(400).json({ message: "用户名和密码不能为空" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { username } });

    if (!user) {
      return res.status(401).json({ message: "用户名或密码错误" });
    }

    if (user.status === "disabled") {
      return res.status(403).json({ message: "账号已被禁用" });
    }

    if (user.status === "frozen") {
      return res.status(403).json({
        message: "账号已被冻结，请联系管理员或申请解冻",
        frozen: true,
      });
    }

    const isValid = await comparePassword(password, user.passwordHash);

    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.ip || "";
    const userAgent = req.headers["user-agent"] || "";

    if (!isValid) {
      await recordLoginLog({
        userId: user.id,
        systemId,
        ipAddress,
        userAgent,
        status: "failed",
        failureReason: "密码错误",
      });

      await createAuditLog({
        userId: user.id,
        username: user.username,
        action: "login",
        level: "warning",
        description: "登录失败: 密码错误",
        ipAddress,
      });

      return res.status(401).json({ message: "用户名或密码错误" });
    }

    const abnormalResult = await detectAbnormalLogin({
      userId: user.id,
      ipAddress,
      userAgent,
      loginTime: new Date(),
      systemId,
    });

    if (abnormalResult.require2FA) {
      await sendTwoFactorAuthCode(user.id, user.phone);

      await recordLoginLog({
        userId: user.id,
        systemId,
        ipAddress,
        userAgent,
        status: "pending_2fa",
        abnormalType: abnormalResult.abnormalType,
        isAbnormal: true,
        failureReason: abnormalResult.reason,
      });

      return res.status(200).json({
        require2FA: true,
        message: "检测到异常登录行为，请进行二次认证",
        abnormalType: abnormalResult.abnormalType,
        abnormalReason: abnormalResult.reason,
      });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    await recordLoginLog({
      userId: user.id,
      systemId,
      ipAddress,
      userAgent,
      status: "success",
    });

    await createAuditLog({
      userId: user.id,
      username: user.username,
      action: "login",
      level: "info",
      description: "登录成功",
      ipAddress,
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "登录失败", error: (error as Error).message });
  }
});

router.post("/2fa/verify", async (req: Request, res: Response) => {
  try {
    const { userId, code, systemId = 1 } = req.body;

    if (!userId || !code) {
      return res.status(400).json({ message: "参数不完整" });
    }

    const result = await verifyTwoFactorCode(userId, code);

    if (!result.valid) {
      return res.status(400).json({ message: result.message });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ message: "用户不存在" });
    }

    const token = generateToken({
      userId: user.id,
      username: user.username,
      role: user.role,
    });

    const ipAddress = (req.headers["x-forwarded-for"] as string) || req.ip || "";

    await recordLoginLog({
      userId: user.id,
      systemId,
      ipAddress,
      userAgent: req.headers["user-agent"] || "",
      status: "success",
      twoFactorVerified: true,
      twoFactorMethod: "sms",
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        realName: user.realName,
        email: user.email,
        phone: user.phone,
        department: user.department,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "验证失败", error: (error as Error).message });
  }
});

router.post("/2fa/send", async (req: Request, res: Response) => {
  try {
    const { userId, phone } = req.body;

    if (!userId || !phone) {
      return res.status(400).json({ message: "参数不完整" });
    }

    const result = await sendTwoFactorAuthCode(userId, phone);
    res.json(result);
  } catch (error) {
    res.status(500).json({ message: "发送失败", error: (error as Error).message });
  }
});

router.get("/me", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "未认证" });
    }

    res.json({
      id: req.user.id,
      username: req.user.username,
      realName: req.user.realName,
      email: req.user.email,
      phone: req.user.phone,
      department: req.user.department,
      role: req.user.role,
      status: req.user.status,
      lastLoginAt: req.user.lastLoginAt,
    });
  } catch (error) {
    res.status(500).json({ message: "获取用户信息失败", error: (error as Error).message });
  }
});

router.post("/logout", authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await createAuditLog({
      userId: req.userId,
      action: "logout",
      level: "info",
      description: "登出",
      ipAddress: (req.headers["x-forwarded-for"] as string) || req.ip,
    });

    res.json({ message: "登出成功" });
  } catch (error) {
    res.status(500).json({ message: "登出失败", error: (error as Error).message });
  }
});

export default router;
