import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/auth";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";

export interface AuthRequest extends Request {
  user?: User;
  userId?: number;
}

export const authMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({ message: "未提供认证令牌" });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ message: "认证令牌无效或已过期" });
    }

    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: decoded.userId } });

    if (!user) {
      return res.status(401).json({ message: "用户不存在" });
    }

    if (user.status === "disabled" || user.status === "frozen") {
      return res.status(403).json({ message: "账号已被禁用或冻结" });
    }

    req.user = user;
    req.userId = user.id;
    next();
  } catch (error) {
    res.status(500).json({ message: "认证失败", error: (error as Error).message });
  }
};

export const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ message: "未认证" });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "权限不足" });
    }

    next();
  };
};
