import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { LoginLog, AbnormalType, LoginStatus } from "../entities/LoginLog";
import { SecurityAlert } from "../entities/SecurityAlert";
import { getDefaultPolicy } from "./passwordService";
import {
  sendTwoFactorCode,
  generateTwoFactorCode,
  sendSecurityAlertToGroup,
} from "./notificationService";
import { createAuditLog } from "./auditService";

const twoFactorCodes = new Map<string, { code: string; expiresAt: number }>();

export const detectAbnormalLogin = async (params: {
  userId: number;
  ipAddress: string;
  userAgent?: string;
  deviceFingerprint?: string;
  loginTime: Date;
  systemId: number;
}): Promise<{
  isAbnormal: boolean;
  abnormalType: AbnormalType;
  require2FA: boolean;
  reason: string;
}> => {
  const policy = await getDefaultPolicy();
  const userRepo = AppDataSource.getRepository(User);
  const loginLogRepo = AppDataSource.getRepository(LoginLog);

  const user = await userRepo.findOne({ where: { id: params.userId } });
  if (!user) {
    return { isAbnormal: false, abnormalType: "none", require2FA: false, reason: "" };
  }

  const abnormalTypes: AbnormalType[] = [];
  const reasons: string[] = [];

  const loginHour = params.loginTime.getHours();
  const [workStartHour, workStartMin] = policy.workStartTime.split(":").map(Number);
  const [workEndHour, workEndMin] = policy.workEndTime.split(":").map(Number);

  const workStartMinutes = workStartHour * 60 + workStartMin;
  const workEndMinutes = workEndHour * 60 + workEndMin;
  const loginMinutes = loginHour * 60 + params.loginTime.getMinutes();

  if (loginMinutes < workStartMinutes || loginMinutes > workEndMinutes) {
    abnormalTypes.push("non_working_hours");
    reasons.push("非工作时间登录");
  }

  if (user.lastLoginIp && user.lastLoginIp !== params.ipAddress) {
    const recentLogs = await loginLogRepo.find({
      where: { userId: params.userId },
      order: { createdAt: "DESC" },
      take: 10,
    });

    const knownIps = new Set(recentLogs.map((log) => log.ipAddress));
    if (!knownIps.has(params.ipAddress) && knownIps.size > 0) {
      abnormalTypes.push("unusual_location");
      reasons.push("异地IP登录");
    }
  }

  if (user.failedLoginAttempts >= policy.maxFailedAttempts) {
    abnormalTypes.push("multiple_failures");
    reasons.push("连续登录失败多次");
  }

  if (params.deviceFingerprint && user.abnormalLoginCount > 0) {
    const recentDeviceLogs = await loginLogRepo.find({
      where: { userId: params.userId },
      order: { createdAt: "DESC" },
      take: 5,
    });

    const knownDevices = new Set(
      recentDeviceLogs
        .map((log) => log.deviceFingerprint)
        .filter((fp) => fp !== null) as string[]
    );

    if (!knownDevices.has(params.deviceFingerprint) && knownDevices.size > 0) {
      abnormalTypes.push("new_device");
      reasons.push("新设备登录");
    }
  }

  const isAbnormal = abnormalTypes.length > 0;
  const require2FA = isAbnormal;

  return {
    isAbnormal,
    abnormalType: abnormalTypes[0] || "none",
    require2FA,
    reason: reasons.join("; "),
  };
};

export const recordLoginLog = async (params: {
  userId: number;
  systemId: number;
  ipAddress: string;
  userAgent?: string;
  deviceFingerprint?: string;
  location?: string;
  status: LoginStatus;
  abnormalType?: AbnormalType;
  isAbnormal?: boolean;
  twoFactorVerified?: boolean;
  twoFactorMethod?: string;
  failureReason?: string;
}): Promise<LoginLog> => {
  const loginLogRepo = AppDataSource.getRepository(LoginLog);
  const userRepo = AppDataSource.getRepository(User);

  const log = loginLogRepo.create({
    userId: params.userId,
    systemId: params.systemId,
    ipAddress: params.ipAddress,
    userAgent: params.userAgent,
    deviceFingerprint: params.deviceFingerprint,
    location: params.location,
    status: params.status,
    abnormalType: params.abnormalType || "none",
    isAbnormal: params.isAbnormal || false,
    twoFactorVerified: params.twoFactorVerified || false,
    twoFactorMethod: params.twoFactorMethod,
    failureReason: params.failureReason,
  });

  const savedLog = await loginLogRepo.save(log);

  const user = await userRepo.findOne({ where: { id: params.userId } });
  if (user) {
    if (params.status === "success") {
      user.failedLoginAttempts = 0;
      user.lastLoginAt = new Date();
      user.lastLoginIp = params.ipAddress;
    } else if (params.status === "failed") {
      user.failedLoginAttempts += 1;
    }

    if (params.isAbnormal) {
      user.abnormalLoginCount += 1;

      const policy = await getDefaultPolicy();
      if (user.abnormalLoginCount >= policy.maxAbnormalAttempts) {
        user.status = "frozen";
        user.frozenAt = new Date();

        const alertRepo = AppDataSource.getRepository(SecurityAlert);
        const alert = alertRepo.create({
          alertType: "account_frozen",
          severity: "critical",
          title: "账号自动冻结",
          description: `用户 ${user.realName} (${user.username}) 因累计 ${user.abnormalLoginCount} 次异常登录，账号已自动冻结。`,
          userId: user.id,
          username: user.username,
          pushedToGroup: true,
        });
        await alertRepo.save(alert);

        await sendSecurityAlertToGroup(
          "账号冻结",
          "账号自动冻结",
          `用户 ${user.realName} (${user.username}) 因累计 ${user.abnormalLoginCount} 次异常登录被自动冻结。`,
          "critical"
        );

        await createAuditLog({
          userId: user.id,
          username: user.username,
          action: "account_freeze",
          level: "critical",
          description: "因多次异常登录，账号自动冻结",
          ipAddress: params.ipAddress,
        });
      }
    }

    await userRepo.save(user);
  }

  return savedLog;
};

export const sendTwoFactorAuthCode = async (
  userId: number,
  phone: string
): Promise<{ success: boolean; message: string }> => {
  const code = generateTwoFactorCode();
  const expiresAt = Date.now() + 5 * 60 * 1000;

  twoFactorCodes.set(String(userId), { code, expiresAt });

  const sent = await sendTwoFactorCode(phone, code);

  if (sent) {
    await createAuditLog({
      userId,
      action: "two_factor_auth",
      level: "info",
      description: "发送二次认证短信验证码",
    });
  }

  return {
    success: sent,
    message: sent ? "验证码已发送" : "验证码发送失败",
  };
};

export const verifyTwoFactorCode = async (
  userId: number,
  code: string
): Promise<{ valid: boolean; message: string }> => {
  const stored = twoFactorCodes.get(String(userId));

  if (!stored) {
    return { valid: false, message: "请先获取验证码" };
  }

  if (Date.now() > stored.expiresAt) {
    twoFactorCodes.delete(String(userId));
    return { valid: false, message: "验证码已过期" };
  }

  if (stored.code !== code) {
    return { valid: false, message: "验证码错误" };
  }

  twoFactorCodes.delete(String(userId));

  await createAuditLog({
    userId,
    action: "two_factor_auth",
    level: "info",
    description: "二次认证通过",
  });

  return { valid: true, message: "验证成功" };
};

export const unfreezeAccount = async (
  userId: number,
  adminUserId: number
): Promise<boolean> => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });

  if (!user || user.status !== "frozen") {
    return false;
  }

  user.status = "active";
  user.abnormalLoginCount = 0;
  user.frozenAt = null as any;
  await userRepo.save(user);

  await createAuditLog({
    userId: adminUserId,
    action: "account_unfreeze",
    level: "warning",
    description: `解冻用户账号: ${user.username}`,
  });

  return true;
};

export const getLoginLogs = async (params: {
  userId?: number;
  systemId?: number;
  isAbnormal?: boolean;
  startTime?: Date;
  endTime?: Date;
  page?: number;
  pageSize?: number;
}): Promise<{ logs: LoginLog[]; total: number }> => {
  const loginLogRepo = AppDataSource.getRepository(LoginLog);
  const queryBuilder = loginLogRepo.createQueryBuilder("log");

  if (params.userId) {
    queryBuilder.andWhere("log.userId = :userId", { userId: params.userId });
  }

  if (params.systemId) {
    queryBuilder.andWhere("log.systemId = :systemId", { systemId: params.systemId });
  }

  if (params.isAbnormal !== undefined) {
    queryBuilder.andWhere("log.isAbnormal = :isAbnormal", {
      isAbnormal: params.isAbnormal,
    });
  }

  if (params.startTime) {
    queryBuilder.andWhere("log.createdAt >= :startTime", { startTime: params.startTime });
  }

  if (params.endTime) {
    queryBuilder.andWhere("log.createdAt <= :endTime", { endTime: params.endTime });
  }

  queryBuilder.orderBy("log.createdAt", "DESC");

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  queryBuilder.skip((page - 1) * pageSize).take(pageSize);

  const [logs, total] = await queryBuilder.getManyAndCount();

  return { logs, total };
};
