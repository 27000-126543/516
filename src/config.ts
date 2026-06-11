export const config = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || "password-security-super-secret-key-2024",
  jwtExpiresIn: "24h",
  bcryptSaltRounds: 10,
  passwordHistoryCount: 5,
  passwordMinLength: 8,
  passwordRotationDays: 90,
  reminderDaysBeforeExpiry: 7,
  disableAfterHours: 24,
  maxFailedLoginAttempts: 3,
  maxAbnormalLoginCount: 5,
  workStartTime: "09:00",
  workEndTime: "18:00",
  smsApi: {
    enabled: false,
    mock: true,
  },
  enterpriseWechat: {
    enabled: false,
    webhookUrl: "",
  },
  database: {
    type: "sqlite",
    database: "./database/password_security.db",
  },
};
