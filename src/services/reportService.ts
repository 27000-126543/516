import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { System } from "../entities/System";
import { PasswordRotationTask } from "../entities/PasswordRotationTask";
import { LoginLog } from "../entities/LoginLog";
import { SecurityAlert } from "../entities/SecurityAlert";
import { AuditLog } from "../entities/AuditLog";
import dayjs from "dayjs";
import * as XLSX from "xlsx";
import PDFDocument from "pdfkit";
import { createAuditLog } from "./auditService";
import * as fs from "fs";
import * as path from "path";

export interface HealthReportData {
  generatedAt: Date;
  totalUsers: number;
  totalSystems: number;
  weakPasswordCount: number;
  weakPasswordRatio: number;
  rotationCompletionRate: number;
  pendingRotationTasks: number;
  overdueRotationTasks: number;
  frozenAccountCount: number;
  frozenAccountRatio: number;
  disabledAccountCount: number;
  abnormalLoginCount: number;
  securityAlerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  systemBreakdown: Array<{
    systemId: number;
    systemName: string;
    weakPasswordCount: number;
    rotationCompletionRate: number;
    abnormalLoginCount: number;
  }>;
  trends: {
    last7Days: {
      date: string;
      abnormalLogins: number;
      passwordChanges: number;
      securityAlerts: number;
    }[];
  };
}

export const generateHealthReport = async (): Promise<HealthReportData> => {
  const userRepo = AppDataSource.getRepository(User);
  const systemRepo = AppDataSource.getRepository(System);
  const taskRepo = AppDataSource.getRepository(PasswordRotationTask);
  const loginLogRepo = AppDataSource.getRepository(LoginLog);
  const alertRepo = AppDataSource.getRepository(SecurityAlert);

  const [totalUsers, totalSystems, users] = await Promise.all([
    userRepo.count(),
    systemRepo.count({ where: { isActive: true } }),
    userRepo.find(),
  ]);

  const weakPasswordCount = users.filter((u) => u.isWeakPassword).length;
  const frozenAccountCount = users.filter((u) => u.status === "frozen").length;
  const disabledAccountCount = users.filter((u) => u.status === "disabled").length;

  const [pendingTasks, overdueTasks, totalTasks] = await Promise.all([
    taskRepo.count({ where: { status: "pending" } }),
    taskRepo.count({ where: { status: "overdue" } }),
    taskRepo.count(),
  ]);

  const completedTasks = await taskRepo.count({ where: { status: "completed" } });
  const rotationCompletionRate =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 100;

  const abnormalLoginCount = await loginLogRepo.count({ where: { isAbnormal: true } });

  const [criticalAlerts, highAlerts, mediumAlerts, lowAlerts, totalAlerts] =
    await Promise.all([
      alertRepo.count({ where: { severity: "critical" } }),
      alertRepo.count({ where: { severity: "high" } }),
      alertRepo.count({ where: { severity: "medium" } }),
      alertRepo.count({ where: { severity: "low" } }),
      alertRepo.count(),
    ]);

  const systems = await systemRepo.find({ where: { isActive: true } });
  const systemBreakdown: HealthReportData["systemBreakdown"] = [];

  for (const system of systems) {
    const systemUsers = users.filter((u) => u.isWeakPassword);
    const systemTasks = await taskRepo.find({ where: { systemId: system.id } });
    const systemCompletedTasks = systemTasks.filter((t) => t.status === "completed");
    const systemAbnormalLogins = await loginLogRepo.count({
      where: { systemId: system.id, isAbnormal: true },
    });

    systemBreakdown.push({
      systemId: system.id,
      systemName: system.systemName,
      weakPasswordCount: systemUsers.length,
      rotationCompletionRate:
        systemTasks.length > 0
          ? Math.round((systemCompletedTasks.length / systemTasks.length) * 100)
          : 100,
      abnormalLoginCount: systemAbnormalLogins,
    });
  }

  const last7Days: HealthReportData["trends"]["last7Days"] = [];
  for (let i = 6; i >= 0; i--) {
    const date = dayjs().subtract(i, "day").startOf("day");
    const nextDate = date.add(1, "day");

    const [abnormalLogins, passwordChanges, securityAlerts] = await Promise.all([
      loginLogRepo
        .createQueryBuilder("log")
        .where("log.createdAt >= :start AND log.createdAt < :end", {
          start: date.toDate(),
          end: nextDate.toDate(),
        })
        .andWhere("log.isAbnormal = true")
        .getCount(),
      taskRepo
        .createQueryBuilder("task")
        .where("task.completedAt >= :start AND task.completedAt < :end", {
          start: date.toDate(),
          end: nextDate.toDate(),
        })
        .getCount(),
      alertRepo
        .createQueryBuilder("alert")
        .where("alert.createdAt >= :start AND alert.createdAt < :end", {
          start: date.toDate(),
          end: nextDate.toDate(),
        })
        .getCount(),
    ]);

    last7Days.push({
      date: date.format("YYYY-MM-DD"),
      abnormalLogins,
      passwordChanges,
      securityAlerts,
    });
  }

  return {
    generatedAt: new Date(),
    totalUsers,
    totalSystems,
    weakPasswordCount,
    weakPasswordRatio: totalUsers > 0 ? (weakPasswordCount / totalUsers) * 100 : 0,
    rotationCompletionRate,
    pendingRotationTasks: pendingTasks,
    overdueRotationTasks: overdueTasks,
    frozenAccountCount,
    frozenAccountRatio: totalUsers > 0 ? (frozenAccountCount / totalUsers) * 100 : 0,
    disabledAccountCount,
    abnormalLoginCount,
    securityAlerts: {
      total: totalAlerts,
      critical: criticalAlerts,
      high: highAlerts,
      medium: mediumAlerts,
      low: lowAlerts,
    },
    systemBreakdown,
    trends: {
      last7Days,
    },
  };
};

export const exportReportToExcel = async (report: HealthReportData): Promise<Buffer> => {
  const wb = XLSX.utils.book_new();

  const summaryData = [
    ["指标", "数值"],
    ["生成时间", report.generatedAt.toLocaleString("zh-CN")],
    ["用户总数", report.totalUsers],
    ["系统总数", report.totalSystems],
    ["弱密码数量", report.weakPasswordCount],
    ["弱密码占比", `${report.weakPasswordRatio.toFixed(2)}%`],
    ["密码轮换完成率", `${report.rotationCompletionRate}%`],
    ["待处理轮换任务", report.pendingRotationTasks],
    ["逾期轮换任务", report.overdueRotationTasks],
    ["冻结账号数", report.frozenAccountCount],
    ["冻结账号占比", `${report.frozenAccountRatio.toFixed(2)}%`],
    ["禁用账号数", report.disabledAccountCount],
    ["异常登录次数", report.abnormalLoginCount],
    ["安全告警总数", report.securityAlerts.total],
    ["严重告警", report.securityAlerts.critical],
    ["高危告警", report.securityAlerts.high],
    ["中危告警", report.securityAlerts.medium],
    ["低危告警", report.securityAlerts.low],
  ];
  const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, ws1, "总体概览");

  const systemData = [
    ["系统名称", "弱密码数", "轮换完成率", "异常登录次数"],
    ...report.systemBreakdown.map((s) => [
      s.systemName,
      s.weakPasswordCount,
      `${s.rotationCompletionRate}%`,
      s.abnormalLoginCount,
    ]),
  ];
  const ws2 = XLSX.utils.aoa_to_sheet(systemData);
  XLSX.utils.book_append_sheet(wb, ws2, "系统明细");

  const trendData = [
    ["日期", "异常登录", "密码变更", "安全告警"],
    ...report.trends.last7Days.map((d) => [
      d.date,
      d.abnormalLogins,
      d.passwordChanges,
      d.securityAlerts,
    ]),
  ];
  const ws3 = XLSX.utils.aoa_to_sheet(trendData);
  XLSX.utils.book_append_sheet(wb, ws3, "7日趋势");

  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  return buffer;
};

export const exportReportToPDF = async (report: HealthReportData): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.fontSize(20).text("密码安全健康报告", { align: "center" });
    doc.moveDown();
    doc.fontSize(10).text(`生成时间: ${report.generatedAt.toLocaleString("zh-CN")}`);
    doc.moveDown();

    doc.fontSize(14).text("一、总体概览");
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`用户总数: ${report.totalUsers}`);
    doc.text(`系统总数: ${report.totalSystems}`);
    doc.text(`弱密码数量: ${report.weakPasswordCount} (${report.weakPasswordRatio.toFixed(2)}%)`);
    doc.text(`密码轮换完成率: ${report.rotationCompletionRate}%`);
    doc.text(`待处理轮换任务: ${report.pendingRotationTasks}`);
    doc.text(`逾期轮换任务: ${report.overdueRotationTasks}`);
    doc.text(`冻结账号数: ${report.frozenAccountCount} (${report.frozenAccountRatio.toFixed(2)}%)`);
    doc.text(`禁用账号数: ${report.disabledAccountCount}`);
    doc.text(`异常登录次数: ${report.abnormalLoginCount}`);
    doc.moveDown();

    doc.fontSize(14).text("二、安全告警统计");
    doc.moveDown(0.5);
    doc.fontSize(11);
    doc.text(`告警总数: ${report.securityAlerts.total}`);
    doc.text(`严重: ${report.securityAlerts.critical}`);
    doc.text(`高危: ${report.securityAlerts.high}`);
    doc.text(`中危: ${report.securityAlerts.medium}`);
    doc.text(`低危: ${report.securityAlerts.low}`);
    doc.moveDown();

    doc.fontSize(14).text("三、各系统明细");
    doc.moveDown(0.5);
    doc.fontSize(11);
    report.systemBreakdown.forEach((s) => {
      doc.text(
        `${s.systemName}: 弱密码 ${s.weakPasswordCount} 个, 轮换完成率 ${s.rotationCompletionRate}%, 异常登录 ${s.abnormalLoginCount} 次`
      );
    });
    doc.moveDown();

    doc.fontSize(14).text("四、近7日趋势");
    doc.moveDown(0.5);
    doc.fontSize(11);
    report.trends.last7Days.forEach((d) => {
      doc.text(
        `${d.date}: 异常登录 ${d.abnormalLogins}, 密码变更 ${d.passwordChanges}, 安全告警 ${d.securityAlerts}`
      );
    });

    doc.end();
  });
};

export const generateDailyReport = async (): Promise<HealthReportData> => {
  const report = await generateHealthReport();

  const reportDir = path.join(process.cwd(), "reports");
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }

  const dateStr = dayjs().format("YYYY-MM-DD");
  const excelPath = path.join(reportDir, `health-report-${dateStr}.xlsx`);
  const pdfPath = path.join(reportDir, `health-report-${dateStr}.pdf`);

  const excelBuffer = await exportReportToExcel(report);
  fs.writeFileSync(excelPath, excelBuffer);

  const pdfBuffer = await exportReportToPDF(report);
  fs.writeFileSync(pdfPath, pdfBuffer);

  await createAuditLog({
    action: "report_generate",
    level: "info",
    description: `自动生成每日健康报告: ${dateStr}`,
  });

  return report;
};
