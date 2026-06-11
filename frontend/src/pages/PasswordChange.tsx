import { useState, useEffect } from "react";
import { Card, Form, Input, Button, Progress, Tag, message, Space, Alert } from "antd";
import { KeyOutlined, CheckCircleOutlined } from "@ant-design/icons";
import api from "../services/api";

const PasswordChange: React.FC = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [strength, setStrength] = useState<any>(null);
  const [complexityErrors, setComplexityErrors] = useState<string[]>([]);
  const [policy, setPolicy] = useState<any>(null);
  const [passwordInfo, setPasswordInfo] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [policyRes, infoRes] = await Promise.all([
        api.get("/password/policy"),
        api.get("/password/strength"),
      ]);
      setPolicy(policyRes.data.policy);
      setPasswordInfo(infoRes.data);
    } catch (error) {
      console.error("获取数据失败", error);
    }
  };

  const handlePasswordChange = async (value: string) => {
    if (!value || value.length < 4) {
      setStrength(null);
      setComplexityErrors([]);
      return;
    }

    setValidating(true);
    try {
      const response = await api.post("/password/validate", { password: value });
      setStrength(response.data.strength);
      setComplexityErrors(response.data.complexityErrors);
    } catch (error) {
      console.error("验证密码失败", error);
    } finally {
      setValidating(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setLoading(true);
    try {
      await api.post("/password/change", {
        oldPassword: values.oldPassword,
        newPassword: values.newPassword,
      });
      message.success("密码修改成功");
      form.resetFields();
      setStrength(null);
      setComplexityErrors([]);
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "修改失败");
    } finally {
      setLoading(false);
    }
  };

  const getStrengthColor = (score: number) => {
    const colors = ["#ff4d4f", "#fa8c16", "#faad14", "#52c41a", "#73d13d"];
    return colors[score] || "#999";
  };

  const getStrengthLabel = (level: string) => {
    const labels: Record<string, string> = {
      very_weak: "非常弱",
      weak: "弱",
      medium: "中等",
      strong: "强",
      very_strong: "非常强",
    };
    return labels[level] || level;
  };

  const rules = policy
    ? [
        { label: `至少 ${policy.minLength} 个字符`, met: true },
        { label: "包含大写字母", met: policy.requireUppercase },
        { label: "包含小写字母", met: policy.requireLowercase },
        { label: "包含数字", met: policy.requireNumber },
        { label: "包含特殊字符", met: policy.requireSpecialChar },
        { label: `不能与最近 ${policy.historyCount} 次密码重复`, met: true },
      ]
    : [];

  return (
    <div>
      <Card title="修改密码" style={{ maxWidth: 600, margin: "0 auto" }}>
        {passwordInfo?.isExpiringSoon && (
          <Alert
            message="密码即将到期"
            description={`您的密码将在 ${passwordInfo.daysUntilExpiry} 天后到期，请及时修改。`}
            type="warning"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}
        {passwordInfo?.isExpired && (
          <Alert
            message="密码已过期"
            description="您的密码已过期，请立即修改。"
            type="error"
            showIcon
            style={{ marginBottom: 24 }}
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="原密码"
            name="oldPassword"
            rules={[{ required: true, message: "请输入原密码" }]}
          >
            <Input.Password size="large" prefix={<KeyOutlined />} placeholder="请输入原密码" />
          </Form.Item>

          <Form.Item
            label="新密码"
            name="newPassword"
            rules={[
              { required: true, message: "请输入新密码" },
              { min: policy?.minLength || 8, message: `密码至少 ${policy?.minLength || 8} 位` },
            ]}
          >
            <Input.Password
              size="large"
              prefix={<KeyOutlined />}
              placeholder="请输入新密码"
              onChange={(e) => handlePasswordChange(e.target.value)}
            />
          </Form.Item>

          {strength && (
            <div style={{ marginBottom: 24, padding: 16, background: "#fafafa", borderRadius: 8 }}>
              <div style={{ marginBottom: 12 }}>
                <span>密码强度：</span>
                <Tag color={getStrengthColor(strength.score)}>
                  {getStrengthLabel(strength.level)}
                </Tag>
              </div>
              <Progress
                percent={strength.score * 25}
                strokeColor={getStrengthColor(strength.score)}
                showInfo={false}
                style={{ marginBottom: 12 }}
              />
              {strength.suggestions?.length > 0 && (
                <div>
                  <div style={{ fontSize: 12, color: "#999", marginBottom: 4 }}>改进建议：</div>
                  <ul style={{ fontSize: 12, color: "#666", paddingLeft: 20, margin: 0 }}>
                    {strength.suggestions.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          <Form.Item
            label="确认新密码"
            name="confirmPassword"
            dependencies={["newPassword"]}
            rules={[
              { required: true, message: "请确认新密码" },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue("newPassword") === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error("两次输入的密码不一致"));
                },
              }),
            ]}
          >
            <Input.Password
              size="large"
              prefix={<KeyOutlined />}
              placeholder="请再次输入新密码"
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} size="large" block>
              修改密码
            </Button>
          </Form.Item>
        </Form>

        <div style={{ padding: 16, background: "#f6ffed", borderRadius: 8, border: "1px solid #b7eb8f" }}>
          <div style={{ fontWeight: 500, marginBottom: 8, color: "#389e0d" }}>
            <CheckCircleOutlined style={{ marginRight: 4 }} />
            密码复杂度要求
          </div>
          <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: "#666" }}>
            {rules.map((rule, index) => (
              <li key={index} style={{ marginBottom: 4 }}>
                {rule.label}
              </li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default PasswordChange;
