import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { System } from "../entities/System";
import { PasswordPolicy } from "../entities/PasswordPolicy";
import { WeakPassword } from "../entities/WeakPassword";
import { hashPassword } from "../utils/auth";
import { checkPasswordStrength, validatePasswordComplexity } from "../utils/password";
import { createAuditLog } from "./auditService";
import * as fs from "fs";
import csv from "csv-parser";

export interface ImportResult {
  success: boolean;
  total: number;
  successful: number;
  failed: number;
  errors: string[];
  warnings: string[];
}

export interface UserImportRow {
  username: string;
  realName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  password: string;
  supervisorId?: string;
  systemCode?: string;
}

export const importUsersFromCSV = async (
  filePath: string,
  adminUserId: number
): Promise<ImportResult> => {
  const results: UserImportRow[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let successful = 0;
  let failed = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        results.push(data as UserImportRow);
      })
      .on("end", async () => {
        try {
          const userRepo = AppDataSource.getRepository(User);

          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const lineNum = i + 2;

            try {
              if (!row.username || !row.realName || !row.email || !row.phone) {
                errors.push(`第 ${lineNum} 行: 缺少必填字段`);
                failed++;
                continue;
              }

              const existingUser = await userRepo.findOne({
                where: { username: row.username },
              });
              if (existingUser) {
                warnings.push(`第 ${lineNum} 行: 用户名 ${row.username} 已存在，跳过`);
                failed++;
                continue;
              }

              const complexityResult = validatePasswordComplexity(row.password);
              if (!complexityResult.valid) {
                errors.push(
                  `第 ${lineNum} 行: 密码不满足复杂度要求 - ${complexityResult.errors.join(
                    "; "
                  )}`
                );
                failed++;
                continue;
              }

              const strengthResult = checkPasswordStrength(row.password, [
                row.username,
                row.email,
                row.realName,
              ]);

              const passwordHash = await hashPassword(row.password);

              const role = row.role || "employee";
              if (!["employee", "manager", "director", "admin"].includes(role)) {
                warnings.push(`第 ${lineNum} 行: 无效角色 ${row.role}，使用默认 employee`);
              }

              const user = userRepo.create({
                username: row.username,
                passwordHash,
                realName: row.realName,
                email: row.email,
                phone: row.phone,
                department: row.department || "",
                role: ["employee", "manager", "director", "admin"].includes(role)
                  ? (role as User["role"])
                  : "employee",
                status: "active",
                lastPasswordChange: new Date(),
                passwordStrengthScore: strengthResult.score,
                isWeakPassword: strengthResult.isWeak,
                supervisorId: row.supervisorId ? parseInt(row.supervisorId) : undefined,
              });

              await userRepo.save(user);
              successful++;
            } catch (err) {
              errors.push(`第 ${lineNum} 行: 导入失败 - ${(err as Error).message}`);
              failed++;
            }
          }

          await createAuditLog({
            userId: adminUserId,
            action: "batch_import",
            level: "info",
            description: `批量导入用户，共 ${results.length} 条，成功 ${successful} 条，失败 ${failed} 条`,
          });

          resolve({
            success: true,
            total: results.length,
            successful,
            failed,
            errors,
            warnings,
          });
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
};

export const importPolicyFromCSV = async (
  filePath: string,
  adminUserId: number
): Promise<ImportResult> => {
  const results: any[] = [];
  const errors: string[] = [];
  const warnings: string[] = [];
  let successful = 0;
  let failed = 0;

  return new Promise((resolve, reject) => {
    fs.createReadStream(filePath)
      .pipe(csv())
      .on("data", (data) => {
        results.push(data);
      })
      .on("end", async () => {
        try {
          const systemRepo = AppDataSource.getRepository(System);

          for (let i = 0; i < results.length; i++) {
            const row = results[i];
            const lineNum = i + 2;

            try {
              if (!row.systemCode || !row.systemName) {
                errors.push(`第 ${lineNum} 行: 缺少必填字段 systemCode 或 systemName`);
                failed++;
                continue;
              }

              let system = await systemRepo.findOne({
                where: { systemCode: row.systemCode },
              });

              if (system) {
                system.systemName = row.systemName || system.systemName;
                system.description = row.description || system.description;
                system.passwordRotationDays = row.rotationDays
                  ? parseInt(row.rotationDays)
                  : system.passwordRotationDays;
                system.reminderDaysBeforeExpiry = row.reminderDays
                  ? parseInt(row.reminderDays)
                  : system.reminderDaysBeforeExpiry;
                system.disableAfterHours = row.disableAfterHours
                  ? parseInt(row.disableAfterHours)
                  : system.disableAfterHours;
                warnings.push(`第 ${lineNum} 行: 系统 ${row.systemCode} 已存在，已更新`);
              } else {
                system = systemRepo.create({
                  systemCode: row.systemCode,
                  systemName: row.systemName,
                  description: row.description || "",
                  passwordRotationDays: row.rotationDays
                    ? parseInt(row.rotationDays)
                    : 90,
                  reminderDaysBeforeExpiry: row.reminderDays
                    ? parseInt(row.reminderDays)
                    : 7,
                  disableAfterHours: row.disableAfterHours
                    ? parseInt(row.disableAfterHours)
                    : 24,
                  isActive: true,
                });
              }

              await systemRepo.save(system);
              successful++;
            } catch (err) {
              errors.push(`第 ${lineNum} 行: 导入失败 - ${(err as Error).message}`);
              failed++;
            }
          }

          await createAuditLog({
            userId: adminUserId,
            action: "batch_import",
            level: "info",
            description: `批量导入系统策略，共 ${results.length} 条，成功 ${successful} 条，失败 ${failed} 条`,
          });

          resolve({
            success: true,
            total: results.length,
            successful,
            failed,
            errors,
            warnings,
          });
        } catch (err) {
          reject(err);
        }
      })
      .on("error", reject);
  });
};

export const importWeakPasswords = async (
  passwords: string[],
  adminUserId: number
): Promise<ImportResult> => {
  const weakPasswordRepo = AppDataSource.getRepository(WeakPassword);
  let successful = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const password of passwords) {
    try {
      const existing = await weakPasswordRepo.findOne({ where: { password } });
      if (existing) {
        existing.frequency += 1;
        await weakPasswordRepo.save(existing);
      } else {
        const wp = weakPasswordRepo.create({ password });
        await weakPasswordRepo.save(wp);
      }
      successful++;
    } catch (err) {
      errors.push(`密码 "${password}": ${(err as Error).message}`);
      failed++;
    }
  }

  await createAuditLog({
    userId: adminUserId,
    action: "batch_import",
    level: "info",
    description: `批量导入弱密码库，共 ${passwords.length} 条，成功 ${successful} 条`,
  });

  return {
    success: true,
    total: passwords.length,
    successful,
    failed,
    errors,
    warnings: [],
  };
};

export const validateCSVData = (headers: string[], requiredFields: string[]): { valid: boolean; missing: string[] } => {
  const missing = requiredFields.filter((field) => !headers.includes(field));
  return {
    valid: missing.length === 0,
    missing,
  };
};
