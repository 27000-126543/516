import { useState } from "react";
import {
  Card,
  Tabs,
  Upload,
  Button,
  message,
  Alert,
  List,
  Input,
  Space,
  Tag,
} from "antd";
import {
  UploadOutlined,
  FileExcelOutlined,
  UserOutlined,
  SettingOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import type { UploadProps } from "antd";
import api from "../services/api";

const { TextArea } = Input;

const ImportPage: React.FC = () => {
  const [importResult, setImportResult] = useState<any>(null);
  const [weakPasswords, setWeakPasswords] = useState("");
  const [loading, setLoading] = useState(false);

  const handleUploadUsers: UploadProps["beforeUpload"] = (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        setLoading(true);
        const response = await api.post("/import/users", {
          filePath: "/tmp/" + file.name,
        });
        setImportResult(response.data);
        message.success("导入完成");
      } catch (error: any) {
        message.error(error.response?.data?.message || "导入失败");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleUploadSystems: UploadProps["beforeUpload"] = (file) => {
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        setLoading(true);
        const response = await api.post("/import/systems", {
          filePath: "/tmp/" + file.name,
        });
        setImportResult(response.data);
        message.success("导入完成");
      } catch (error: any) {
        message.error(error.response?.data?.message || "导入失败");
      } finally {
        setLoading(false);
      }
    };
    reader.readAsText(file);
    return false;
  };

  const handleImportWeakPasswords = async () => {
    if (!weakPasswords.trim()) {
      message.warning("请输入弱密码列表");
      return;
    }

    const passwords = weakPasswords
      .split("\n")
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    if (passwords.length === 0) {
      message.warning("请输入有效的密码");
      return;
    }

    try {
      setLoading(true);
      const response = await api.post("/import/weak-passwords", { passwords });
      setImportResult(response.data);
      message.success(`成功导入 ${response.data.successful} 个弱密码`);
      setWeakPasswords("");
    } catch (error: any) {
      message.error(error.response?.data?.message || "导入失败");
    } finally {
      setLoading(false);
    }
  };

  const tabItems = [
    {
      key: "users",
      label: (
        <span>
          <UserOutlined /> 用户导入
        </span>
      ),
      children: (
        <div>
          <Alert
            message="CSV格式要求"
            description={
              <div>
                <p>必需字段：username, realName, email, phone, password</p>
                <p>可选字段：department, role, supervisorId, systemCode</p>
                <p>角色取值：employee(员工), manager(经理), director(总监), admin(管理员)</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Upload
            beforeUpload={handleUploadUsers}
            accept=".csv"
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} size="large" type="primary">
              选择CSV文件导入用户
            </Button>
          </Upload>
        </div>
      ),
    },
    {
      key: "systems",
      label: (
        <span>
          <SettingOutlined /> 系统策略导入
        </span>
      ),
      children: (
        <div>
          <Alert
            message="CSV格式要求"
            description={
              <div>
                <p>必需字段：systemCode, systemName</p>
                <p>可选字段：description, rotationDays, reminderDays, disableAfterHours</p>
              </div>
            }
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Upload
            beforeUpload={handleUploadSystems}
            accept=".csv"
            showUploadList={false}
          >
            <Button icon={<UploadOutlined />} size="large" type="primary">
              选择CSV文件导入系统策略
            </Button>
          </Upload>
        </div>
      ),
    },
    {
      key: "weak",
      label: (
        <span>
          <SafetyOutlined /> 弱密码库导入
        </span>
      ),
      children: (
        <div>
          <Alert
            message="弱密码库管理"
            description="每行输入一个弱密码，系统会将其加入弱密码库。用户设置密码时会自动检测是否为弱密码。"
            type="info"
            showIcon
            style={{ marginBottom: 24 }}
          />
          <Space direction="vertical" style={{ width: "100%" }} size="large">
            <TextArea
              rows={10}
              placeholder="每行一个弱密码，例如：&#10;123456&#10;password&#10;admin123&#10;qwerty"
              value={weakPasswords}
              onChange={(e) => setWeakPasswords(e.target.value)}
            />
            <Button
              type="primary"
              size="large"
              onClick={handleImportWeakPasswords}
              loading={loading}
            >
              导入弱密码
            </Button>
          </Space>
        </div>
      ),
    },
  ];

  return (
    <div>
      <Card title="批量导入">
        <Tabs defaultActiveKey="users" items={tabItems} />

        {importResult && (
          <Card
            title="导入结果"
            style={{ marginTop: 24 }}
            extra={
              <Space>
                <Tag color="green">成功 {importResult.successful}</Tag>
                <Tag color="red">失败 {importResult.failed}</Tag>
                <Tag color="blue">总计 {importResult.total}</Tag>
              </Space>
            }
          >
            {importResult.warnings?.length > 0 && (
              <div style={{ marginBottom: 16 }}>
                <h4>警告信息 ({importResult.warnings.length})</h4>
                <List
                  size="small"
                  dataSource={importResult.warnings.slice(0, 10)}
                  renderItem={(item: string) => (
                    <List.Item>
                      <Tag color="orange">警告</Tag> {item}
                    </List.Item>
                  )}
                />
                {importResult.warnings.length > 10 && (
                  <p style={{ color: "#999", marginTop: 8 }}>
                    ...还有 {importResult.warnings.length - 10} 条警告
                  </p>
                )}
              </div>
            )}

            {importResult.errors?.length > 0 && (
              <div>
                <h4>错误信息 ({importResult.errors.length})</h4>
                <List
                  size="small"
                  dataSource={importResult.errors.slice(0, 10)}
                  renderItem={(item: string) => (
                    <List.Item>
                      <Tag color="red">错误</Tag> {item}
                    </List.Item>
                  )}
                />
                {importResult.errors.length > 10 && (
                  <p style={{ color: "#999", marginTop: 8 }}>
                    ...还有 {importResult.errors.length - 10} 条错误
                  </p>
                )}
              </div>
            )}
          </Card>
        )}
      </Card>
    </div>
  );
};

export default ImportPage;
