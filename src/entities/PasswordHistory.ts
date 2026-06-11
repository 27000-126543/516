import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "./User";

@Entity()
export class PasswordHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: number;

  @Column()
  passwordHash: string;

  @Column({ default: 0 })
  strengthScore: number;

  @Column({ nullable: true })
  systemId: number;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => User, (user) => user.passwordHistories)
  @JoinColumn({ name: "userId" })
  user: User;
}
