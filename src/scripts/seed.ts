import "reflect-metadata";
import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { System } from "../entities/System";
import { WeakPassword } from "../entities/WeakPassword";
import { PasswordPolicy } from "../entities/PasswordPolicy";
import { hashPassword } from "../utils/auth";
import { checkPasswordStrength } from "../utils/password";

export const seedDatabase = async () => {
  const userRepo = AppDataSource.getRepository(User);
  const systemRepo = AppDataSource.getRepository(System);
  const weakPasswordRepo = AppDataSource.getRepository(WeakPassword);
  const policyRepo = AppDataSource.getRepository(PasswordPolicy);

  const systemCount = await systemRepo.count();
  if (systemCount === 0) {
    const systems = [
      { systemCode: "OA", systemName: "办公自动化系统", passwordRotationDays: 90, reminderDaysBeforeExpiry: 7, description: "企业OA办公系统" },
      { systemCode: "ERP", systemName: "企业资源计划系统", passwordRotationDays: 60, reminderDaysBeforeExpiry: 7, description: "ERP管理系统" },
      { systemCode: "CRM", systemName: "客户关系管理系统", passwordRotationDays: 90, reminderDaysBeforeExpiry: 7, description: "客户管理系统" },
      { systemCode: "HR", systemName: "人力资源系统", passwordRotationDays: 90, reminderDaysBeforeExpiry: 7, description: "人事管理系统" },
      { systemCode: "FIN", systemName: "财务管理系统", passwordRotationDays: 30, reminderDaysBeforeExpiry: 7, description: "财务系统" },
    ];

    for (const s of systems) {
      const system = systemRepo.create(s);
      await systemRepo.save(system);
    }
    console.log("已初始化系统数据");
  }

  const policyCount = await policyRepo.count();
  if (policyCount === 0) {
    const policy = policyRepo.create({
      policyName: "默认密码策略",
      rotationDays: 90,
      reminderDays: 7,
      minLength: 8,
      requireUppercase: true,
      requireLowercase: true,
      requireNumber: true,
      requireSpecialChar: true,
      historyCount: 5,
      maxFailedAttempts: 3,
      maxAbnormalAttempts: 5,
      disableAfterHours: 24,
      workStartTime: "09:00",
      workEndTime: "18:00",
      isDefault: true,
      isActive: true,
    });
    await policyRepo.save(policy);
    console.log("已初始化默认密码策略");
  }

  const wpCount = await weakPasswordRepo.count();
  if (wpCount === 0) {
    const commonWeakPasswords = [
      "123456", "password", "12345678", "qwerty", "123456789",
      "12345", "1234", "111111", "1234567", "dragon",
      "123123", "baseball", "iloveyou", "trustno1", "sunshine",
      "princess", "football", "welcome", "shadow", "monkey",
      "abc123", "admin", "letmein", "654321", "superman",
      "qazwsx", "michael", "password1", "passw0rd", "hello",
    ];

    for (const pwd of commonWeakPasswords) {
      const wp = weakPasswordRepo.create({ password: pwd, category: "common" });
      await weakPasswordRepo.save(wp);
    }
    console.log("已初始化弱密码库");
  }

  const userCount = await userRepo.count();
  if (userCount === 0) {
    const adminPassword = "Admin@123456";
    const adminHash = await hashPassword(adminPassword);
    const adminStrength = checkPasswordStrength(adminPassword);

    const admin = userRepo.create({
      username: "admin",
      passwordHash: adminHash,
      realName: "系统管理员",
      email: "admin@company.com",
      phone: "13800000000",
      department: "信息部",
      role: "admin",
      status: "active",
      lastPasswordChange: new Date(),
      passwordStrengthScore: adminStrength.score,
      isWeakPassword: adminStrength.isWeak,
    });
    await userRepo.save(admin);

    const directorPassword = "Director@2024";
    const directorHash = await hashPassword(directorPassword);
    const directorStrength = checkPasswordStrength(directorPassword, ["director"]);

    const director = userRepo.create({
      username: "director",
      passwordHash: directorHash,
      realName: "张总监",
      email: "director@company.com",
      phone: "13800000001",
      department: "信息部",
      role: "director",
      status: "active",
      lastPasswordChange: new Date(),
      passwordStrengthScore: directorStrength.score,
      isWeakPassword: directorStrength.isWeak,
      supervisorId: admin.id,
    });
    await userRepo.save(director);

    const managerPassword = "Manager@2024";
    const managerHash = await hashPassword(managerPassword);
    const managerStrength = checkPasswordStrength(managerPassword, ["manager"]);

    const manager = userRepo.create({
      username: "manager",
      passwordHash: managerHash,
      realName: "李经理",
      email: "manager@company.com",
      phone: "13800000002",
      department: "技术部",
      role: "manager",
      status: "active",
      lastPasswordChange: new Date(),
      passwordStrengthScore: managerStrength.score,
      isWeakPassword: managerStrength.isWeak,
      supervisorId: director.id,
    });
    await userRepo.save(manager);

    const employeePassword = "Employee@2024";
    const employeeHash = await hashPassword(employeePassword);
    const employeeStrength = checkPasswordStrength(employeePassword, ["employee"]);

    const employee = userRepo.create({
      username: "employee",
      passwordHash: employeeHash,
      realName: "王员工",
      email: "employee@company.com",
      phone: "13800000003",
      department: "技术部",
      role: "employee",
      status: "active",
      lastPasswordChange: new Date(Date.now() - 80 * 24 * 60 * 60 * 1000),
      passwordStrengthScore: employeeStrength.score,
      isWeakPassword: employeeStrength.isWeak,
      supervisorId: manager.id,
    });
    await userRepo.save(employee);

    const weakPassword = "123456";
    const weakHash = await hashPassword(weakPassword);
    const weakStrength = checkPasswordStrength(weakPassword);

    const weakUser = userRepo.create({
      username: "testuser",
      passwordHash: weakHash,
      realName: "测试用户",
      email: "test@company.com",
      phone: "13800000004",
      department: "市场部",
      role: "employee",
      status: "active",
      lastPasswordChange: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000),
      passwordStrengthScore: weakStrength.score,
      isWeakPassword: true,
      supervisorId: manager.id,
    });
    await userRepo.save(weakUser);

    console.log("已初始化测试用户数据");
    console.log("管理员账号: admin / Admin@123456");
    console.log("总监账号: director / Director@2024");
    console.log("经理账号: manager / Manager@2024");
    console.log("员工账号: employee / Employee@2024 (密码即将到期)");
    console.log("测试账号: testuser / 123456 (弱密码)");
  }
};
