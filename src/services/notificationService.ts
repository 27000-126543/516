import { config } from "../config";

export interface SmsParams {
  phone: string;
  template: string;
  params?: Record<string, string>;
}

export const sendSms = async (params: SmsParams): Promise<boolean> => {
  console.log(`[SMS Mock] 发送短信到 ${params.phone}, 模板: ${params.template}`);
  if (params.params) {
    console.log(`[SMS Mock] 参数:`, params.params);
  }

  if (!config.smsApi.mock) {
    // 实际短信发送逻辑
  }

  return true;
};

export const sendPasswordExpiryReminder = async (
  phone: string,
  userName: string,
  remainingDays: number
): Promise<boolean> => {
  return sendSms({
    phone,
    template: "password_expiry_reminder",
    params: {
      userName,
      remainingDays: String(remainingDays),
    },
  });
};

export const sendPasswordRotationTaskNotice = async (
  phone: string,
  userName: string,
  systemName: string,
  dueDate: string
): Promise<boolean> => {
  return sendSms({
    phone,
    template: "password_rotation_task",
    params: {
      userName,
      systemName,
      dueDate,
    },
  });
};

export const sendAccountDisabledNotice = async (
  phone: string,
  userName: string,
  systemName: string
): Promise<boolean> => {
  return sendSms({
    phone,
    template: "account_disabled",
    params: {
      userName,
      systemName,
    },
  });
};

export const sendTwoFactorCode = async (
  phone: string,
  code: string
): Promise<boolean> => {
  return sendSms({
    phone,
    template: "two_factor_code",
    params: {
      code,
    },
  });
};

export const generateTwoFactorCode = (): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const sendEnterpriseWechatNotification = async (
  title: string,
  content: string,
  severity: string = "info"
): Promise<boolean> => {
  console.log(`[企业微信 Mock] [${severity.toUpperCase()}] ${title}`);
  console.log(`[企业微信 Mock] 内容: ${content}`);

  if (!config.enterpriseWechat.enabled) {
    return true;
  }

  return true;
};

export const sendSecurityAlertToGroup = async (
  alertType: string,
  title: string,
  description: string,
  severity: string = "high"
): Promise<boolean> => {
  const content = `【安全告警】${alertType}\n标题: ${title}\n描述: ${description}\n严重级别: ${severity}`;
  return sendEnterpriseWechatNotification(title, content, severity);
};
