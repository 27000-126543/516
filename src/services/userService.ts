import { AppDataSource } from "../data-source";
import { User, UserRole, UserStatus } from "../entities/User";
import { hashPassword } from "../utils/auth";
import { checkPasswordStrength, validatePasswordComplexity } from "../utils/password";
import { createAuditLog } from "./auditService";

export const createUser = async (params: {
  username: string;
  password: string;
  realName: string;
  email: string;
  phone: string;
  department: string;
  role: UserRole;
  supervisorId?: number;
  createdBy?: number;
}): Promise<{ success: boolean; message: string; user?: User }> => {
  const userRepo = AppDataSource.getRepository(User);

  const existing = await userRepo.findOne({ where: { username: params.username } });
  if (existing) {
    return { success: false, message: "用户名已存在" };
  }

  const complexityResult = validatePasswordComplexity(params.password);
  if (!complexityResult.valid) {
    return {
      success: false,
      message: "密码不满足复杂度要求",
    };
  }

  const strengthResult = checkPasswordStrength(params.password, [
    params.username,
    params.email,
    params.realName,
  ]);

  const passwordHash = await hashPassword(params.password);

  const user = userRepo.create({
    username: params.username,
    passwordHash,
    realName: params.realName,
    email: params.email,
    phone: params.phone,
    department: params.department,
    role: params.role,
    status: "active",
    lastPasswordChange: new Date(),
    passwordStrengthScore: strengthResult.score,
    isWeakPassword: strengthResult.isWeak,
    supervisorId: params.supervisorId,
  });

  const savedUser = await userRepo.save(user);

  await createAuditLog({
    userId: params.createdBy,
    action: "account_create",
    level: "info",
    description: `创建用户: ${params.username}`,
  });

  return { success: true, message: "用户创建成功", user: savedUser };
};

export const getUserById = async (id: number): Promise<User | null> => {
  const userRepo = AppDataSource.getRepository(User);
  return userRepo.findOne({ where: { id } });
};

export const getUserByUsername = async (username: string): Promise<User | null> => {
  const userRepo = AppDataSource.getRepository(User);
  return userRepo.findOne({ where: { username } });
};

export const getUsers = async (params: {
  page?: number;
  pageSize?: number;
  department?: string;
  role?: UserRole;
  status?: UserStatus;
  keyword?: string;
}): Promise<{ users: User[]; total: number }> => {
  const userRepo = AppDataSource.getRepository(User);
  const queryBuilder = userRepo.createQueryBuilder("user");

  if (params.department) {
    queryBuilder.andWhere("user.department = :department", {
      department: params.department,
    });
  }

  if (params.role) {
    queryBuilder.andWhere("user.role = :role", { role: params.role });
  }

  if (params.status) {
    queryBuilder.andWhere("user.status = :status", { status: params.status });
  }

  if (params.keyword) {
    queryBuilder.andWhere(
      "user.username LIKE :keyword OR user.realName LIKE :keyword OR user.email LIKE :keyword",
      { keyword: `%${params.keyword}%` }
    );
  }

  queryBuilder.orderBy("user.createdAt", "DESC");

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  queryBuilder.skip((page - 1) * pageSize).take(pageSize);

  const [users, total] = await queryBuilder.getManyAndCount();

  return { users, total };
};

export const updateUser = async (
  id: number,
  updates: Partial<User>,
  adminUserId?: number
): Promise<{ success: boolean; message: string; user?: User }> => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id } });

  if (!user) {
    return { success: false, message: "用户不存在" };
  }

  if (updates.username && updates.username !== user.username) {
    const existing = await userRepo.findOne({ where: { username: updates.username } });
    if (existing) {
      return { success: false, message: "用户名已被占用" };
    }
  }

  Object.assign(user, updates);
  const savedUser = await userRepo.save(user);

  await createAuditLog({
    userId: adminUserId,
    action: "system_config_update",
    level: "info",
    description: `更新用户信息: ${user.username}`,
  });

  return { success: true, message: "更新成功", user: savedUser };
};

export const disableUser = async (
  id: number,
  adminUserId: number,
  reason?: string
): Promise<boolean> => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id } });

  if (!user) {
    return false;
  }

  user.status = "disabled";
  await userRepo.save(user);

  await createAuditLog({
    userId: adminUserId,
    action: "account_disable",
    level: "warning",
    description: `禁用用户: ${user.username}, 原因: ${reason || "管理员操作"}`,
  });

  return true;
};

export const enableUser = async (
  id: number,
  adminUserId: number
): Promise<boolean> => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id } });

  if (!user) {
    return false;
  }

  user.status = "active";
  user.failedLoginAttempts = 0;
  await userRepo.save(user);

  await createAuditLog({
    userId: adminUserId,
    action: "account_enable",
    level: "info",
    description: `启用用户: ${user.username}`,
  });

  return true;
};

export const getDepartments = async (): Promise<string[]> => {
  const userRepo = AppDataSource.getRepository(User);
  const users = await userRepo.find({ select: ["department"] });
  const departments = [...new Set(users.map((u) => u.department).filter(d => d))];
  return departments.sort();
};
