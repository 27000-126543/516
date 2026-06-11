const { AppDataSource } = require("./dist/data-source");
const {
  changePassword,
  checkWeakPassword,
} = require("./dist/services/passwordService");
const { checkPasswordStrength } = require("./dist/utils/password");
const { scanPasswordExpiry } = require("./dist/services/rotationService");
const { detectAbnormalLogin } = require("./dist/services/loginService");
const { generateHealthReport } = require("./dist/services/reportService");
const { createApprovalRequest } = require("./dist/services/approvalService");

async function runTests() {
  console.log("=".repeat(60));
  console.log("企业密码安全管理系统 - 功能测试");
  console.log("=".repeat(60));

  try {
    await AppDataSource.initialize();
    console.log("\n✅ 数据库连接成功");

    const userRepo = AppDataSource.getRepository("User");

    const admin = await userRepo.findOne({ where: { username: "admin" } });
    const employee = await userRepo.findOne({ where: { username: "employee" } });
    const testuser = await userRepo.findOne({ where: { username: "testuser" } });

    console.log("\n📊 测试用户数据:");
    console.log(`   - admin: ${admin.realName} (${admin.role})`);
    console.log(`   - employee: ${employee.realName} (${employee.role})`);
    console.log(`   - testuser: ${testuser.realName} (${testuser.role})`);

    console.log("\n" + "=".repeat(60));
    console.log("1. 密码强度检测测试");
    console.log("=".repeat(60));

    const weakPwd = "123456";
    const mediumPwd = "Password123";
    const strongPwd = "MyP@ssw0rd!2024";

    const weakResult = checkPasswordStrength(weakPwd);
    const mediumResult = checkPasswordStrength(mediumPwd);
    const strongResult = checkPasswordStrength(strongPwd);

    console.log(`\n   弱密码 "${weakPwd}": 分数=${weakResult.score}, 等级=${weakResult.strength}`);
    console.log(`   中等密码 "${mediumPwd}": 分数=${mediumResult.score}, 等级=${mediumResult.strength}`);
    console.log(`   强密码 "${strongPwd}": 分数=${strongResult.score}, 等级=${strongResult.strength}`);

    const isWeak = await checkWeakPassword(weakPwd);
    console.log(`\n   "123456" 是否在弱密码库中: ${isWeak ? "是 ✅" : "否"}`);

    console.log("\n" + "=".repeat(60));
    console.log("2. 密码修改测试 (历史密码校验)");
    console.log("=".repeat(60));

    const changeResult = await changePassword(
      employee.id,
      "Employee@2024",
      "NewP@ssw0rd!2024",
      "127.0.0.1"
    );
    console.log(`\n   修改密码结果: ${changeResult.success ? "成功 ✅" : "失败: " + changeResult.message}`);

    if (changeResult.success) {
      const repeatResult = await changePassword(
        employee.id,
        "NewP@ssw0rd!2024",
        "NewP@ssw0rd!2024",
        "127.0.0.1"
      );
      console.log(`   重复使用新密码: ${!repeatResult.success ? "被拒绝 ✅ (原因: " + repeatResult.message + ")" : "成功 (不应成功)"}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("3. 异常登录检测测试");
    console.log("=".repeat(60));

    const workHoursLogin = await detectAbnormalLogin({
      userId: admin.id,
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0",
      loginTime: new Date(new Date().setHours(10, 0, 0, 0)),
      systemId: 1,
    });
    console.log(`\n   工作时间登录 (10:00, 内网IP): 异常=${workHoursLogin.isAbnormal}, 需要2FA=${workHoursLogin.require2FA}`);

    const nightLogin = await detectAbnormalLogin({
      userId: admin.id,
      ipAddress: "192.168.1.100",
      userAgent: "Mozilla/5.0",
      loginTime: new Date(new Date().setHours(23, 0, 0, 0)),
      systemId: 1,
    });
    console.log(`   非工作时间登录 (23:00): 异常=${nightLogin.isAbnormal}, 需要2FA=${nightLogin.require2FA}, 原因=${nightLogin.reason} ✅`);

    const remoteLogin = await detectAbnormalLogin({
      userId: admin.id,
      ipAddress: "8.8.8.8",
      userAgent: "Mozilla/5.0",
      loginTime: new Date(new Date().setHours(10, 0, 0, 0)),
      systemId: 1,
    });
    console.log(`   异地IP登录 (8.8.8.8): 异常=${remoteLogin.isAbnormal}, 需要2FA=${remoteLogin.require2FA}, 原因=${remoteLogin.reason} ✅`);

    console.log("\n" + "=".repeat(60));
    console.log("4. 密码轮换扫描测试");
    console.log("=".repeat(60));

    const scanResult = await scanPasswordExpiry();
    console.log(`\n   扫描结果:`);
    console.log(`     - 扫描账号数: ${scanResult.scanned}`);
    console.log(`     - 生成任务数: ${scanResult.tasksCreated}`);
    console.log(`     - 发送提醒数: ${scanResult.remindersSent}`);
    console.log(`     - 禁用账号数: ${scanResult.accountsDisabled}`);

    console.log("\n" + "=".repeat(60));
    console.log("5. 审批流程测试");
    console.log("=".repeat(60));

    const approval = await createApprovalRequest({
      requesterId: employee.id,
      requestType: "account_unlock",
      reason: "因账号被冻结，申请解锁",
      relatedAccountId: employee.id,
      priority: "medium",
    });
    console.log(`\n   创建审批申请: ${approval ? "成功 ✅" : "失败"}`);
    if (approval) {
      console.log(`     - 申请ID: ${approval.id}`);
      console.log(`     - 审批级别: ${approval.totalLevels}级`);
      console.log(`     - 当前状态: ${approval.status}`);
    }

    console.log("\n" + "=".repeat(60));
    console.log("6. 健康报告生成测试");
    console.log("=".repeat(60));

    const report = await generateHealthReport();
    console.log(`\n   报告数据:`);
    console.log(`     - 总用户数: ${report.totalUsers}`);
    console.log(`     - 总系统数: ${report.totalSystems}`);
    console.log(`     - 弱密码数: ${report.weakPasswordCount}`);
    console.log(`     - 弱密码比例: ${report.weakPasswordRatio}%`);
    console.log(`     - 轮换完成率: ${report.rotationCompletionRate}%`);
    console.log(`     - 冻结账号数: ${report.frozenAccountCount}`);
    console.log(`     - 冻结比例: ${report.frozenAccountRatio}%`);
    console.log(`     - 异常登录次数: ${report.abnormalLoginCount}`);
    console.log(`     - 系统明细: ${report.systemBreakdown.length} 个系统`);

    console.log("\n" + "=".repeat(60));
    console.log("✅ 所有测试完成！");
    console.log("=".repeat(60));

    await AppDataSource.destroy();
  } catch (error) {
    console.error("\n❌ 测试失败:", error);
    try {
      await AppDataSource.destroy();
    } catch (e) {}
    process.exit(1);
  }
}

runTests();
