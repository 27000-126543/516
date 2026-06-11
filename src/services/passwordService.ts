import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { PasswordHistory } from "../entities/PasswordHistory";
import { WeakPassword } from "../entities/WeakPassword";
import { PasswordPolicy } from "../entities/PasswordPolicy";
import { hashPassword, comparePassword } from "../utils/auth";
import {
  checkPasswordStrength,
  validatePasswordComplexity,
} from "../utils/password";
import { createAuditLog } from "./auditService";
import { config } from "../config";

export interface ChangePasswordResult {
  success: boolean;
  message: string;
  errors?: string[];
}

export const changePassword = async (
  userId: number,
  oldPassword: string,
  newPassword: string,
  ipAddress?: string
): Promise<ChangePasswordResult> => {
  const userRepo = AppDataSource.getRepository(User);
  const historyRepo = AppDataSource.getRepository(PasswordHistory);

  const user = await userRepo.findOne({ where: { id: userId } });
  if (!user) {
    return { success: false, message: "用户不存在" };
  }

  const isValidOldPassword = await comparePassword(oldPassword, user.passwordHash);
  if (!isValidOldPassword) {
    return { success: false, message: "原密码错误" };
  }

  const policy = await getDefaultPolicy();

  const complexityResult = validatePasswordComplexity(newPassword, {
    minLength: policy.minLength,
    requireUppercase: policy.requireUppercase,
    requireLowercase: policy.requireLowercase,
    requireNumber: policy.requireNumber,
    requireSpecialChar: policy.requireSpecialChar,
  });

  if (!complexityResult.valid) {
    return {
      success: false,
      message: "密码不满足复杂度要求",
      errors: complexityResult.errors,
    };
  }

  const historyRecords = await historyRepo.find({
    where: { userId },
    order: { createdAt: "DESC" },
    take: policy.historyCount,
  });

  for (const record of historyRecords) {
    const isDuplicate = await comparePassword(newPassword, record.passwordHash);
    if (isDuplicate) {
      return {
        success: false,
        message: `密码不能与最近 ${policy.historyCount} 次使用的密码重复`,
      };
    }
  }

  const isWeakPassword = await checkWeakPassword(newPassword);
  const strengthResult = checkPasswordStrength(newPassword, [
    user.username,
    user.email,
    user.realName,
  ]);

  const newHash = await hashPassword(newPassword);

  const historyEntry = historyRepo.create({
    userId: user.id,
    passwordHash: newHash,
    strengthScore: strengthResult.score,
  });
  await historyRepo.save(historyEntry);

  user.passwordHash = newHash;
  user.lastPasswordChange = new Date();
  user.passwordStrengthScore = strengthResult.score;
  user.isWeakPassword = isWeakPassword || strengthResult.isWeak;
  user.failedLoginAttempts = 0;
  user.status = "active";

  await userRepo.save(user);

  await createAuditLog({
    userId: user.id,
    username: user.username,
    action: "password_change",
    level: "info",
    description: `用户修改密码成功，密码强度: ${strengthResult.strength}`,
    ipAddress,
  });

  return { success: true, message: "密码修改成功" };
};

export const checkWeakPassword = async (password: string): Promise<boolean> => {
  const weakPasswordRepo = AppDataSource.getRepository(WeakPassword);
  const result = await weakPasswordRepo.findOne({ where: { password } });
  return !!result;
};

export const getDefaultPolicy = async (): Promise<PasswordPolicy> => {
  const policyRepo = AppDataSource.getRepository(PasswordPolicy);
  let policy = await policyRepo.findOne({ where: { isDefault: true, isActive: true } });

  if (!policy) {
    policy = policyRepo.create({
      policyName: "默认密码策略",
      rotationDays: config.passwordRotationDays,
      reminderDays: config.reminderDaysBeforeExpiry,
      minLength: config.passwordMinLength,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true,
      historyCount: config.passwordHistoryCount,
      maxFailedAttempts: config.maxFailedLoginAttempts,
      maxAbnormalAttempts: config.maxAbnormalLoginCount,
      disableAfterHours: config.disableAfterHours,
      workStartTime: config.workStartTime,
      workEndTime: config.workEndTime,
      isDefault: true,
      isActive: true,
    });
    await policyRepo.save(policy);
  }

  return policy;
};

export const getPasswordStrengthInfo = async (userId: number) => {
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({ where: { id: userId } });

  if (!user) {
    return null;
  }

  const policy = await getDefaultPolicy();
  const daysSinceChange = user.lastPasswordChange
    ? Math.floor(
        (new Date().getTime() - new Date(user.lastPasswordChange).getTime()) /
          (1000 * 60 * 60 * 24)
      )
    : policy.rotationDays;

  const daysUntilExpiry = policy.rotationDays - daysSinceChange;

  return {
    userId: user.id,
    username: user.username,
    strengthScore: user.passwordStrengthScore,
    isWeakPassword: user.isWeakPassword,
    daysSinceChange,
    daysUntilExpiry,
    rotationDays: policy.rotationDays,
    isExpiringSoon: daysUntilExpiry <= policy.reminderDays,
    isExpired: daysUntilExpiry <= 0,
  };
};
