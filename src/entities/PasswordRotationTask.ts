import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

export type TaskStatus = "pending" | "in_progress" | "completed" | "overdue" | "disabled";

@Entity()
export class PasswordRotationTask {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  systemId: number;

  @Column({
    type: "varchar",
    default: "pending",
  })
  status: TaskStatus;

  @Column({ type: "datetime" })
  dueDate: Date;

  @Column({ default: false })
  smsSent: boolean;

  @Column({ default: false })
  supervisorNotified: boolean;

  @Column({ type: "datetime", nullable: true })
  completedAt: Date;

  @Column({ type: "datetime", nullable: true })
  disabledAt: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
