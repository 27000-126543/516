import { Router, Response } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { getRotationTasks, scanPasswordExpiry } from "../services/rotationService";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const systemId = req.query.systemId ? parseInt(req.query.systemId as string) : undefined;
    const status = req.query.status as string;

    const userId =
      req.user?.role === "admin" || req.user?.role === "director"
        ? req.query.userId
          ? parseInt(req.query.userId as string)
          : undefined
        : req.userId;

    const result = await getRotationTasks({
      userId,
      systemId,
      status,
      page,
      pageSize,
    });

    res.json({
      tasks: result.tasks,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    res.status(500).json({ message: "获取任务列表失败", error: (error as Error).message });
  }
});

router.post("/scan", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const result = await scanPasswordExpiry();
    res.json({ message: "扫描完成", result });
  } catch (error) {
    res.status(500).json({ message: "扫描失败", error: (error as Error).message });
  }
});

export default router;
