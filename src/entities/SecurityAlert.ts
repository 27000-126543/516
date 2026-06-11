import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
} from "typeorm";

export type AlertSeverity = "low" | "medium" | "high" | "critical";
export type AlertType =
  | "weak_password"
  | "password_expiring"
  | "password_overdue"
  | "abnormal_login"
  | "account_frozen"
  | "multiple_failures"
  | "policy_violation"
  | "security_risk";

@Entity()
export class SecurityAlert {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    type: "varchar",
  })
  alertType: AlertType;

  @Column({
    type: "varchar",
    default: "medium",
  })
  severity: AlertSeverity;

  @Column()
  title: string;

  @Column({ type: "text" })
  description: string;

  @Column({ nullable: true })
  userId: number;

  @Column({ nullable: true })
  username: string;

  @Column({ nullable: true })
  systemId: number;

  @Column({ default: false })
  isRead: boolean;

  @Column({ default: false })
  isResolved: boolean;

  @Column({ type: "text", nullable: true })
  resolutionNotes: string;

  @Column({ default: false })
  pushedToGroup: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @Column({ type: "datetime", nullable: true })
  resolvedAt: Date;
}
