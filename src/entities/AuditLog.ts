import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

export type AuditAction =
  | "login"
  | "logout"
  | "password_change"
  | "password_reset"
  | "account_create"
  | "account_disable"
  | "account_enable"
  | "account_freeze"
  | "account_unfreeze"
  | "policy_update"
  | "batch_import"
  | "approval_create"
  | "approval_approve"
  | "approval_reject"
  | "report_generate"
  | "two_factor_auth"
  | "system_config_update";

export type AuditLevel = "info" | "warning" | "danger" | "critical";

@Entity()
export class AuditLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  username: string;

  @Column({
    type: "varchar",
  })
  action: AuditAction;

  @Column({
    type: "varchar",
    default: "info",
  })
  level: AuditLevel;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ nullable: true })
  ipAddress: string;

  @Column({ nullable: true })
  systemId: number;

  @Column({ type: "text", nullable: true })
  metadata: string;

  @CreateDateColumn()
  createdAt: Date;
}
