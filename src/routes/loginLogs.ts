import { Router, Response } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { getLoginLogs, unfreezeAccount } from "../services/loginService";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const systemId = req.query.systemId ? parseInt(req.query.systemId as string) : undefined;
    const isAbnormal =
      req.query.isAbnormal !== undefined
        ? req.query.isAbnormal === "true"
        : undefined;
    const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;

    const userId =
      req.user?.role === "admin" || req.user?.role === "director"
        ? req.query.userId
          ? parseInt(req.query.userId as string)
          : undefined
        : req.userId;

    const result = await getLoginLogs({
      userId,
      systemId,
      isAbnormal,
      startTime,
      endTime,
      page,
      pageSize,
    });

    res.json({
      logs: result.logs,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    res.status(500).json({ message: "获取登录日志失败", error: (error as Error).message });
  }
});

router.post("/:id/unfreeze", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    const success = await unfreezeAccount(userId, req.userId!);

    if (!success) {
      return res.status(400).json({ message: "解冻失败" });
    }

    res.json({ message: "账号已解冻" });
  } catch (error) {
    res.status(500).json({ message: "解冻失败", error: (error as Error).message });
  }
});

export default router;
