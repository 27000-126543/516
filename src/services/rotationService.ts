import { AppDataSource } from "../data-source";
import { User } from "../entities/User";
import { System } from "../entities/System";
import { PasswordRotationTask } from "../entities/PasswordRotationTask";
import { SecurityAlert } from "../entities/SecurityAlert";
import { getDefaultPolicy } from "./passwordService";
import {
  sendPasswordRotationTaskNotice,
  sendAccountDisabledNotice,
  sendSecurityAlertToGroup,
} from "./notificationService";
import { createAuditLog } from "./auditService";

export const scanPasswordExpiry = async (): Promise<{
  scanned: number;
  tasksCreated: number;
  remindersSent: number;
  accountsDisabled: number;
}> => {
  const userRepo = AppDataSource.getRepository(User);
  const systemRepo = AppDataSource.getRepository(System);
  const taskRepo = AppDataSource.getRepository(PasswordRotationTask);
  const alertRepo = AppDataSource.getRepository(SecurityAlert);

  const policy = await getDefaultPolicy();
  const systems = await systemRepo.find({ where: { isActive: true } });

  const allUsers = await userRepo.find({
    where: { status: "active" },
  });

  let tasksCreated = 0;
  let remindersSent = 0;
  let accountsDisabled = 0;

  for (const user of allUsers) {
    if (!user.lastPasswordChange) {
      user.lastPasswordChange = user.createdAt;
      await userRepo.save(user);
    }

    const daysSinceChange = Math.floor(
      (new Date().getTime() - new Date(user.lastPasswordChange).getTime()) /
        (1000 * 60 * 60 * 24)
    );

    const daysUntilExpiry = policy.rotationDays - daysSinceChange;
    const isExpiringSoon = daysUntilExpiry <= policy.reminderDays && daysUntilExpiry > 0;
    const isExpired = daysUntilExpiry <= 0;

    if (isExpiringSoon || isExpired) {
      for (const system of systems) {
        const existingTask = await taskRepo.findOne({
          where: {
            userId: user.id,
            systemId: system.id,
            status: "pending",
          },
        });

        if (!existingTask) {
          const dueDate = new Date();
          dueDate.setDate(dueDate.getDate() + (isExpired ? 1 : daysUntilExpiry));

          const task = taskRepo.create({
            userId: user.id,
            systemId: system.id,
            status: isExpired ? "overdue" : "pending",
            dueDate,
          });
          await taskRepo.save(task);
          tasksCreated++;

          const smsSent = await sendPasswordRotationTaskNotice(
            user.phone,
            user.realName,
            system.systemName,
            dueDate.toLocaleDateString("zh-CN")
          );

          if (smsSent) {
            task.smsSent = true;
            await taskRepo.save(task);
            remindersSent++;
          }

          const alert = alertRepo.create({
            alertType: isExpired ? "password_overdue" : "password_expiring",
            severity: isExpired ? "high" : "medium",
            title: isExpired ? "密码已过期" : "密码即将到期",
            description: `${user.realName} (${user.username}) 的密码${
              isExpired ? "已过期" : `将在 ${daysUntilExpiry} 天后到期`
            }，系统: ${system.systemName}`,
            userId: user.id,
            username: user.username,
            systemId: system.id,
            pushedToGroup: isExpired,
          });
          await alertRepo.save(alert);

          if (isExpired) {
            await sendSecurityAlertToGroup(
              "密码过期",
              alert.title,
              alert.description,
              "high"
            );
          }
        }
      }
    }
  }

  const overdueTasks = await taskRepo.find({
    where: { status: "overdue" },
  });

  for (const task of overdueTasks) {
    const taskUser = await userRepo.findOne({ where: { id: task.userId } });
    if (!taskUser) continue;

    const hoursOverdue =
      (new Date().getTime() - new Date(task.dueDate).getTime()) / (1000 * 60 * 60);

    if (hoursOverdue >= policy.disableAfterHours && taskUser.status === "active") {
      taskUser.status = "disabled";
      await userRepo.save(taskUser);
      accountsDisabled++;

      task.status = "disabled";
      task.disabledAt = new Date();
      await taskRepo.save(task);

      await sendAccountDisabledNotice(
        taskUser.phone,
        taskUser.realName,
        (await systemRepo.findOne({ where: { id: task.systemId } }))?.systemName || ""
      );

      if (taskUser.supervisorId) {
        const supervisor = await userRepo.findOne({
          where: { id: taskUser.supervisorId },
        });
        if (supervisor) {
          task.supervisorNotified = true;
          await taskRepo.save(task);

          await sendSecurityAlertToGroup(
            "账号自动禁用",
            `账号已自动禁用: ${taskUser.realName}`,
            `员工 ${taskUser.realName} (${taskUser.username}) 因密码逾期 ${Math.floor(
              hoursOverdue
            )} 小时未修改，账号已自动禁用。请主管 ${supervisor.realName} 关注。`,
            "high"
          );
        }
      }

      await createAuditLog({
        userId: taskUser.id,
        username: taskUser.username,
        action: "account_disable",
        level: "warning",
        description: `因密码逾期 ${Math.floor(hoursOverdue)} 小时未修改，账号自动禁用`,
        systemId: task.systemId,
      });
    }
  }

  return {
    scanned: allUsers.length,
    tasksCreated,
    remindersSent,
    accountsDisabled,
  };
};

export const getRotationTasks = async (params: {
  userId?: number;
  systemId?: number;
  status?: string;
  page?: number;
  pageSize?: number;
}): Promise<{ tasks: PasswordRotationTask[]; total: number }> => {
  const taskRepo = AppDataSource.getRepository(PasswordRotationTask);
  const queryBuilder = taskRepo.createQueryBuilder("task");

  if (params.userId) {
    queryBuilder.andWhere("task.userId = :userId", { userId: params.userId });
  }

  if (params.systemId) {
    queryBuilder.andWhere("task.systemId = :systemId", { systemId: params.systemId });
  }

  if (params.status) {
    queryBuilder.andWhere("task.status = :status", { status: params.status });
  }

  queryBuilder.orderBy("task.createdAt", "DESC");

  const page = params.page || 1;
  const pageSize = params.pageSize || 20;

  queryBuilder.skip((page - 1) * pageSize).take(pageSize);

  const [tasks, total] = await queryBuilder.getManyAndCount();

  return { tasks, total };
};

export const completeRotationTask = async (
  taskId: number,
  userId: number
): Promise<boolean> => {
  const taskRepo = AppDataSource.getRepository(PasswordRotationTask);
  const task = await taskRepo.findOne({ where: { id: taskId, userId } });

  if (!task) {
    return false;
  }

  task.status = "completed";
  task.completedAt = new Date();
  await taskRepo.save(task);

  await createAuditLog({
    userId,
    action: "password_change",
    level: "info",
    description: "密码轮换任务完成",
    systemId: task.systemId,
  });

  return true;
};
