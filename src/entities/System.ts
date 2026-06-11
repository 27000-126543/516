import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
} from "typeorm";

@Entity()
export class System {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  systemCode: string;

  @Column()
  systemName: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 90 })
  passwordRotationDays: number;

  @Column({ default: 7 })
  reminderDaysBeforeExpiry: number;

  @Column({ default: 24 })
  disableAfterHours: number;

  @Column({ default: true })
  isActive: boolean;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
