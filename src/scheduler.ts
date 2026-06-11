import cron from "node-cron";
import { scanPasswordExpiry } from "./services/rotationService";
import { generateDailyReport } from "./services/reportService";

export const startScheduledTasks = () => {
  cron.schedule("0 0 2 * * *", async () => {
    console.log("[定时任务] 开始每日密码到期扫描...");
    try {
      const result = await scanPasswordExpiry();
      console.log(
        `[定时任务] 密码扫描完成: 扫描${result.scanned}人, 新任务${result.tasksCreated}个, 提醒${result.remindersSent}条, 禁用${result.accountsDisabled}个`
      );
    } catch (error) {
      console.error("[定时任务] 密码扫描失败:", error);
    }
  });

  cron.schedule("0 0 3 * * *", async () => {
    console.log("[定时任务] 开始生成每日健康报告...");
    try {
      await generateDailyReport();
      console.log("[定时任务] 每日健康报告生成完成");
    } catch (error) {
      console.error("[定时任务] 报告生成失败:", error);
    }
  });

  console.log("[定时任务] 已注册每日凌晨2点密码扫描、3点健康报告");
};
