import { useState } from "react";
import { Form, Input, Button, message, Modal } from "antd";
import { UserOutlined, LockOutlined, SafetyOutlined } from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, verify2FA } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [twoFAVisible, setTwoFAVisible] = useState(false);
  const [pendingUserId, setPendingUserId] = useState<number | null>(null);
  const [twoFACode, setTwoFACode] = useState("");
  const [twoFALoading, setTwoFALoading] = useState(false);

  const handleLogin = async (values: { username: string; password: string }) => {
    setLoading(true);
    try {
      const result = await login(values.username, values.password);

      if (result.require2FA) {
        message.warning(result.message);
        setPendingUserId(result.userId || 1);
        setTwoFAVisible(true);
      } else {
        const { token, user } = result;
        localStorage.setItem("token", token);
        localStorage.setItem("user", JSON.stringify(user));
        useAuthStore.setState({ token, user, isLoggedIn: true });
        message.success("登录成功");
        navigate("/");
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || "登录失败");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2FA = async () => {
    if (!pendingUserId || !twoFACode) return;

    setTwoFALoading(true);
    try {
      await verify2FA(pendingUserId, twoFACode);
      message.success("验证成功");
      setTwoFAVisible(false);
      navigate("/");
    } catch (error: any) {
      message.error(error.response?.data?.message || "验证失败");
    } finally {
      setTwoFALoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-title">
          <SafetyOutlined style={{ marginRight: 8 }} />
          企业密码安全管理系统
        </div>
        <Form name="login" onFinish={handleLogin} size="large">
          <Form.Item
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input prefix={<UserOutlined />} placeholder="用户名" />
          </Form.Item>
          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password prefix={<LockOutlined />} placeholder="密码" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" loading={loading} block>
              登录
            </Button>
          </Form.Item>
        </Form>
        <div style={{ textAlign: "center", color: "#999", fontSize: 12, marginTop: 20 }}>
          测试账号: admin / Admin@123456
        </div>
      </div>

      <Modal
        title="二次认证"
        open={twoFAVisible}
        onOk={handleVerify2FA}
        onCancel={() => setTwoFAVisible(false)}
        confirmLoading={twoFALoading}
        okText="验证"
      >
        <p>检测到异常登录行为，请输入短信验证码完成二次认证。</p>
        <p style={{ color: "#999", fontSize: 12 }}>验证码已发送至您的手机</p>
        <Input
          size="large"
          placeholder="请输入6位验证码"
          value={twoFACode}
          onChange={(e) => setTwoFACode(e.target.value)}
          maxLength={6}
        />
      </Modal>
    </div>
  );
};

export default Login;
