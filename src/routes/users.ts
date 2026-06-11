import { Router, Response } from "express";
import { authMiddleware, AuthRequest, requireRole } from "../middleware/auth";
import {
  getUsers,
  getUserById,
  createUser,
  updateUser,
  disableUser,
  enableUser,
  getDepartments,
} from "../services/userService";
import { UserRole } from "../entities/User";

const router = Router();

router.use(authMiddleware);

router.get("/", requireRole("admin", "director"), async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const department = req.query.department as string;
    const role = req.query.role as UserRole;
    const status = req.query.status as any;
    const keyword = req.query.keyword as string;

    const result = await getUsers({
      page,
      pageSize,
      department,
      role,
      status,
      keyword,
    });

    res.json({
      users: result.users,
      total: result.total,
      page,
      pageSize,
    });
  } catch (error) {
    res.status(500).json({ message: "获取用户列表失败", error: (error as Error).message });
  }
});

router.get("/departments", async (req: AuthRequest, res: Response) => {
  try {
    const departments = await getDepartments();
    res.json({ departments });
  } catch (error) {
    res.status(500).json({ message: "获取部门列表失败", error: (error as Error).message });
  }
});

router.get("/:id", async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const user = await getUserById(id);

    if (!user) {
      return res.status(404).json({ message: "用户不存在" });
    }

    if (req.user?.role !== "admin" && req.user?.role !== "director" && req.userId !== id) {
      return res.status(403).json({ message: "权限不足" });
    }

    res.json({
      id: user.id,
      username: user.username,
      realName: user.realName,
      email: user.email,
      phone: user.phone,
      department: user.department,
      role: user.role,
      status: user.status,
      lastPasswordChange: user.lastPasswordChange,
      passwordStrengthScore: user.passwordStrengthScore,
      isWeakPassword: user.isWeakPassword,
      lastLoginAt: user.lastLoginAt,
      lastLoginIp: user.lastLoginIp,
      abnormalLoginCount: user.abnormalLoginCount,
      supervisorId: user.supervisorId,
      createdAt: user.createdAt,
    });
  } catch (error) {
    res.status(500).json({ message: "获取用户信息失败", error: (error as Error).message });
  }
});

router.post("/", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const result = await createUser({
      ...req.body,
      createdBy: req.userId,
    });

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.status(201).json({
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    res.status(500).json({ message: "创建用户失败", error: (error as Error).message });
  }
});

router.put("/:id", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const result = await updateUser(id, req.body, req.userId);

    if (!result.success) {
      return res.status(400).json({ message: result.message });
    }

    res.json({
      message: result.message,
      user: result.user,
    });
  } catch (error) {
    res.status(500).json({ message: "更新用户失败", error: (error as Error).message });
  }
});

router.post("/:id/disable", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const { reason } = req.body;

    const success = await disableUser(id, req.userId!, reason);

    if (!success) {
      return res.status(404).json({ message: "用户不存在" });
    }

    res.json({ message: "用户已禁用" });
  } catch (error) {
    res.status(500).json({ message: "禁用用户失败", error: (error as Error).message });
  }
});

router.post("/:id/enable", requireRole("admin"), async (req: AuthRequest, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const success = await enableUser(id, req.userId!);

    if (!success) {
      return res.status(404).json({ message: "用户不存在" });
    }

    res.json({ message: "用户已启用" });
  } catch (error) {
    res.status(500).json({ message: "启用用户失败", error: (error as Error).message });
  }
});

export default router;
