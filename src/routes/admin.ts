import { Router, Response } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import { AppDataSource } from "../data-source";
import { System } from "../entities/System";
import { SecurityAlert } from "../entities/SecurityAlert";
import { createAuditLog } from "../services/auditService";

const router = Router();

router.use(authMiddleware);

router.get("/systems", async (req: AuthRequest, res: Response) => {
  try {
    const systemRepo = AppDataSource.getRepository(System);
    const systems = await systemRepo.find({ where: { isActive: true } });
    res.json({ systems });
  } catch (error) {
    res.status(500).json({ message: "获取系统列表失败", error: (error as Error).message });
  }
});

router.post("/systems", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const systemRepo = AppDataSource.getRepository(System);
    const system = systemRepo.create(req.body as any);
    const saved = await systemRepo.save(system);

    await createAuditLog({
      userId: req.userId,
      action: "system_config_update",
      level: "info",
      description: `创建系统: ${(system as any).systemName}`,
    });

    res.status(201).json({ system: saved });
  } catch (error) {
    res.status(500).json({ message: "创建系统失败", error: (error as Error).message });
  }
});

router.put("/systems/:id", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const systemRepo = AppDataSource.getRepository(System);
    const system = await systemRepo.findOne({ where: { id } });

    if (!system) {
      return res.status(404).json({ message: "系统不存在" });
    }

    Object.assign(system, req.body);
    const saved = await systemRepo.save(system);

    await createAuditLog({
      userId: req.userId,
      action: "system_config_update",
      level: "info",
      description: `更新系统配置: ${system.systemName}`,
    });

    res.json({ system: saved });
  } catch (error) {
    res.status(500).json({ message: "更新系统失败", error: (error as Error).message });
  }
});

router.get("/alerts", async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const severity = req.query.severity as string;
    const isRead = req.query.isRead !== undefined ? req.query.isRead === "true" : undefined;
    const alertType = req.query.alertType as string;

    const alertRepo = AppDataSource.getRepository(SecurityAlert);
    const queryBuilder = alertRepo.createQueryBuilder("alert");

    if (severity) {
      queryBuilder.andWhere("alert.severity = :severity", { severity });
    }

    if (isRead !== undefined) {
      queryBuilder.andWhere("alert.isRead = :isRead", { isRead });
    }

    if (alertType) {
      queryBuilder.andWhere("alert.alertType = :alertType", { alertType });
    }

    if (req.user?.role !== "admin" && req.user?.role !== "director") {
      queryBuilder.andWhere("alert.userId = :userId", { userId: req.userId });
    }

    queryBuilder.orderBy("alert.createdAt", "DESC");
    queryBuilder.skip((page - 1) * pageSize).take(pageSize);

    const [alerts, total] = await queryBuilder.getManyAndCount();

    res.json({ alerts, total, page, pageSize });
  } catch (error) {
    res.status(500).json({ message: "获取告警失败", error: (error as Error).message });
  }
});

router.post("/alerts/:id/read", async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const alertRepo = AppDataSource.getRepository(SecurityAlert);
    const alert = await alertRepo.findOne({ where: { id } });

    if (!alert) {
      return res.status(404).json({ message: "告警不存在" });
    }

    alert.isRead = true;
    await alertRepo.save(alert);

    res.json({ message: "已标记为已读" });
  } catch (error) {
    res.status(500).json({ message: "操作失败", error: (error as Error).message });
  }
});

router.post("/alerts/:id/resolve", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { resolutionNotes } = req.body;
    const alertRepo = AppDataSource.getRepository(SecurityAlert);
    const alert = await alertRepo.findOne({ where: { id } });

    if (!alert) {
      return res.status(404).json({ message: "告警不存在" });
    }

    alert.isResolved = true;
    alert.resolutionNotes = resolutionNotes;
    alert.resolvedAt = new Date();
    await alertRepo.save(alert);

    res.json({ message: "已标记为已解决" });
  } catch (error) {
    res.status(500).json({ message: "操作失败", error: (error as Error).message });
  }
});

router.get("/alerts/stats", async (req: AuthRequest, res: Response) => {
  try {
    const alertRepo = AppDataSource.getRepository(SecurityAlert);

    const unreadCount = await alertRepo.count({ where: { isRead: false } });
    const unresolvedCount = await alertRepo.count({ where: { isResolved: false } });
    const criticalCount = await alertRepo.count({ where: { severity: "critical", isResolved: false } });
    const highCount = await alertRepo.count({ where: { severity: "high", isResolved: false } });

    res.json({
      unread: unreadCount,
      unresolved: unresolvedCount,
      critical: criticalCount,
      high: highCount,
    });
  } catch (error) {
    res.status(500).json({ message: "获取统计失败", error: (error as Error).message });
  }
});

export default router;
