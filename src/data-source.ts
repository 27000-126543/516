import "reflect-metadata";
import { DataSource } from "typeorm";
import { User } from "./entities/User";
import { System } from "./entities/System";
import { PasswordHistory } from "./entities/PasswordHistory";
import { PasswordRotationTask } from "./entities/PasswordRotationTask";
import { LoginLog } from "./entities/LoginLog";
import { ApprovalRequest } from "./entities/ApprovalRequest";
import { AuditLog } from "./entities/AuditLog";
import { PasswordPolicy } from "./entities/PasswordPolicy";
import { SecurityAlert } from "./entities/SecurityAlert";
import { WeakPassword } from "./entities/WeakPassword";

export const AppDataSource = new DataSource({
  type: "sqlite",
  database: "./database/password_security.db",
  synchronize: true,
  logging: false,
  entities: [
    User,
    System,
    PasswordHistory,
    PasswordRotationTask,
    LoginLog,
    ApprovalRequest,
    AuditLog,
    PasswordPolicy,
    SecurityAlert,
    WeakPassword,
  ],
  subscribers: [],
  migrations: [],
});
