import { Layout, Menu, Avatar, Dropdown, Badge, Space } from "antd";
import {
  DashboardOutlined,
  KeyOutlined,
  ReloadOutlined,
  LoginOutlined,
  CheckCircleOutlined,
  UserOutlined,
  BarChartOutlined,
  FileTextOutlined,
  BellOutlined,
  UploadOutlined,
  SettingOutlined,
  LogoutOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { useState, useEffect } from "react";
import api from "../services/api";

const { Header, Sider, Content } = Layout;

interface MenuItem {
  key: string;
  icon: React.ReactNode;
  label: string;
  path: string;
  roles?: string[];
}

const MainLayout: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [alertCount, setAlertCount] = useState(0);

  useEffect(() => {
    fetchAlertStats();
  }, []);

  const fetchAlertStats = async () => {
    try {
      const response = await api.get("/admin/alerts/stats");
      setAlertCount(response.data.unread || 0);
    } catch (error) {
      console.error("获取告警统计失败", error);
    }
  };

  const menuItems: MenuItem[] = [
    { key: "dashboard", icon: <DashboardOutlined />, label: "数据概览", path: "/" },
    { key: "password", icon: <KeyOutlined />, label: "密码管理", path: "/password" },
    { key: "rotation", icon: <ReloadOutlined />, label: "密码轮换", path: "/rotation" },
    { key: "login-logs", icon: <LoginOutlined />, label: "登录日志", path: "/login-logs" },
    { key: "approvals", icon: <CheckCircleOutlined />, label: "审批中心", path: "/approvals" },
    { key: "alerts", icon: <SafetyOutlined />, label: "安全告警", path: "/alerts" },
  ];

  const adminItems: MenuItem[] = [
    { key: "users", icon: <UserOutlined />, label: "用户管理", path: "/users", roles: ["admin", "director"] },
    { key: "reports", icon: <BarChartOutlined />, label: "健康报告", path: "/reports", roles: ["admin", "director", "manager"] },
    { key: "audit", icon: <FileTextOutlined />, label: "审计日志", path: "/audit", roles: ["admin", "director"] },
    { key: "import", icon: <UploadOutlined />, label: "批量导入", path: "/import", roles: ["admin"] },
    { key: "systems", icon: <SettingOutlined />, label: "系统配置", path: "/systems", roles: ["admin"] },
  ];

  const allItems = [...menuItems];
  if (user && (user.role === "admin" || user.role === "director" || user.role === "manager")) {
    adminItems.forEach((item) => {
      if (!item.roles || item.roles.includes(user!.role)) {
        allItems.push(item);
      }
    });
  }

  const handleMenuClick = ({ key }: { key: string }) => {
    const item = allItems.find((i) => i.key === key);
    if (item) {
      navigate(item.path);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const userMenuItems = [
    {
      key: "profile",
      icon: <UserOutlined />,
      label: "个人中心",
    },
    {
      key: "logout",
      icon: <LogoutOutlined />,
      label: "退出登录",
      onClick: handleLogout,
    },
  ];

  const selectedKey = allItems.find((item) => item.path === location.pathname)?.key || "dashboard";

  return (
    <Layout className="app-layout" style={{ minHeight: "100vh" }}>
      <Sider theme="dark" width={220}>
        <div className="logo">
          <SafetyOutlined style={{ marginRight: 8 }} />
          密码安全管理
        </div>
        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={[selectedKey]}
          onClick={handleMenuClick}
          items={allItems.map((item) => ({
            key: item.key,
            icon: item.icon,
            label: item.label,
          }))}
        />
      </Sider>
      <Layout>
        <Header
          style={{
            background: "#fff",
            padding: "0 24px",
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            boxShadow: "0 1px 4px rgba(0,21,41,.08)",
          }}
        >
          <Space size={24}>
            <Badge count={alertCount} size="small">
              <BellOutlined
                style={{ fontSize: 18, cursor: "pointer", color: "#666" }}
                onClick={() => navigate("/alerts")}
              />
            </Badge>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: "pointer" }}>
                <Avatar size="small" icon={<UserOutlined />} />
                <span>{user?.realName || user?.username}</span>
              </Space>
            </Dropdown>
          </Space>
        </Header>
        <Content className="content-wrapper">
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
};

export default MainLayout;
