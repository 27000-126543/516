import { Router, Response } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { getAuditLogs } from "../services/auditService";
import { AuditAction, AuditLevel } from "../entities/AuditLog";

const router = Router();

router.use(authMiddleware);

router.get("/", requireRole("admin", "director"), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const userId = req.query.userId ? parseInt(req.query.userId as string) : undefined;
    const action = req.query.action as AuditAction;
    const level = req.query.level as AuditLevel;
    const systemId = req.query.systemId ? parseInt(req.query.systemId as string) : undefined;
    const startTime = req.query.startTime ? new Date(req.query.startTime as string) : undefined;
    const endTime = req.query.endTime ? new Date(req.query.endTime as string) : undefined;

    const result = await getAuditLogs({
      page,
      pageSize,
      userId,
      action,
      level,
      systemId,
      startTime,
      endTime,
    });

    res.json({
      logs: result.logs,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    res.status(500).json({ message: "获取审计日志失败", error: (error as Error).message });
  }
});

export default router;
