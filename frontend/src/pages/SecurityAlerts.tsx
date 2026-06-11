import { useState, useEffect } from "react";
import { Card, Table, Tag, Space, Select, Button, Modal, message, Badge } from "antd";
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  SafetyOutlined,
} from "@ant-design/icons";
import api from "../services/api";
import dayjs from "dayjs";

const SecurityAlerts: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [severity, setSeverity] = useState<string | undefined>();
  const [alertType, setAlertType] = useState<string | undefined>();
  const [isRead, setIsRead] = useState<boolean | undefined>();
  const [detailModal, setDetailModal] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, severity, alertType, isRead]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (severity) params.severity = severity;
      if (alertType) params.alertType = alertType;
      if (isRead !== undefined) params.isRead = isRead;

      const response = await api.get("/admin/alerts", { params });
      setData(response.data.alerts);
      setTotal(response.data.total);
    } catch (error) {
      console.error("获取告警列表失败", error);
    } finally {
      setLoading(false);
    }
  };

  const handleRead = async (id: number) => {
    try {
      await api.post(`/admin/alerts/${id}/read`);
      fetchData();
    } catch (error) {
      console.error("标记已读失败", error);
    }
  };

  const handleResolve = async (id: number) => {
    try {
      await api.post(`/admin/alerts/${id}/resolve`, {
        resolutionNotes: "已处理",
      });
      message.success("已标记为已解决");
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "操作失败");
    }
  };

  const viewDetail = (record: any) => {
    setSelectedAlert(record);
    setDetailModal(true);
    if (!record.isRead) {
      handleRead(record.id);
    }
  };

  const getSeverityTag = (severity: string) => {
    const severityMap: Record<string, { color: string; text: string }> = {
      low: { color: "green", text: "低危" },
      medium: { color: "blue", text: "中危" },
      high: { color: "orange", text: "高危" },
      critical: { color: "purple", text: "严重" },
    };
    const info = severityMap[severity] || { color: "default", text: severity };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      weak_password: "弱密码",
      password_expiring: "密码即将到期",
      password_overdue: "密码逾期",
      abnormal_login: "异常登录",
      account_frozen: "账号冻结",
      multiple_failures: "多次失败",
      policy_violation: "策略违规",
      security_risk: "安全风险",
    };
    return typeMap[type] || type;
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "状态",
      dataIndex: "isRead",
      key: "isRead",
      width: 60,
      render: (read: boolean) =>
        read ? (
          <Badge status="default" text="已读" />
        ) : (
          <Badge status="processing" text="未读" />
        ),
    },
    {
      title: "级别",
      dataIndex: "severity",
      key: "severity",
      width: 100,
      render: (s: string) => getSeverityTag(s),
    },
    {
      title: "类型",
      dataIndex: "alertType",
      key: "alertType",
      width: 120,
      render: (type: string) => getTypeLabel(type),
    },
    {
      title: "标题",
      dataIndex: "title",
      key: "title",
      ellipsis: true,
    },
    {
      title: "用户",
      dataIndex: "username",
      key: "username",
      width: 120,
      render: (v: string) => v || "-",
    },
    {
      title: "系统ID",
      dataIndex: "systemId",
      key: "systemId",
      width: 80,
      render: (v: number) => v || "-",
    },
    {
      title: "处理状态",
      dataIndex: "isResolved",
      key: "isResolved",
      width: 100,
      render: (resolved: boolean) =>
        resolved ? (
          <Tag color="green">已解决</Tag>
        ) : (
          <Tag color="orange">待处理</Tag>
        ),
    },
    {
      title: "时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 160,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "action",
      width: 150,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" onClick={() => viewDetail(record)}>
            详情
          </Button>
          {!record.isResolved && (
            <Button
              type="link"
              size="small"
              icon={<CheckCircleOutlined />}
              onClick={() => handleResolve(record.id)}
            >
              处理
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card title="安全告警">
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="级别"
            style={{ width: 120 }}
            allowClear
            value={severity}
            onChange={(v) => setSeverity(v)}
            options={[
              { value: "low", label: "低危" },
              { value: "medium", label: "中危" },
              { value: "high", label: "高危" },
              { value: "critical", label: "严重" },
            ]}
          />
          <Select
            placeholder="类型"
            style={{ width: 150 }}
            allowClear
            value={alertType}
            onChange={(v) => setAlertType(v)}
            options={[
              { value: "weak_password", label: "弱密码" },
              { value: "password_expiring", label: "密码即将到期" },
              { value: "password_overdue", label: "密码逾期" },
              { value: "abnormal_login", label: "异常登录" },
              { value: "account_frozen", label: "账号冻结" },
            ]}
          />
          <Select
            placeholder="阅读状态"
            style={{ width: 120 }}
            allowClear
            value={isRead === undefined ? undefined : isRead ? "read" : "unread"}
            onChange={(v) => {
              if (v === "read") setIsRead(true);
              else if (v === "unread") setIsRead(false);
              else setIsRead(undefined);
            }}
            options={[
              { value: "unread", label: "未读" },
              { value: "read", label: "已读" },
            ]}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1100 }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, ps) => {
              setPage(p);
              setPageSize(ps);
            },
          }}
        />
      </Card>

      <Modal
        title="告警详情"
        open={detailModal}
        onCancel={() => setDetailModal(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModal(false)}>
            关闭
          </Button>,
          <Button
            key="resolve"
            type="primary"
            icon={<CheckCircleOutlined />}
            onClick={() => {
              if (selectedAlert) {
                handleResolve(selectedAlert.id);
                setDetailModal(false);
              }
            }}
          >
            标记已解决
          </Button>,
        ]}
        width={600}
      >
        {selectedAlert && (
          <div>
            <p>
              <strong>级别：</strong>
              {getSeverityTag(selectedAlert.severity)}
            </p>
            <p>
              <strong>类型：</strong>
              {getTypeLabel(selectedAlert.alertType)}
            </p>
            <p>
              <strong>标题：</strong>
              {selectedAlert.title}
            </p>
            <p>
              <strong>用户：</strong>
              {selectedAlert.username || "-"}
            </p>
            <p>
              <strong>系统ID：</strong>
              {selectedAlert.systemId || "-"}
            </p>
            <p>
              <strong>状态：</strong>
              {selectedAlert.isResolved ? (
                <Tag color="green">已解决</Tag>
              ) : (
                <Tag color="orange">待处理</Tag>
              )}
            </p>
            <p>
              <strong>创建时间：</strong>
              {dayjs(selectedAlert.createdAt).format("YYYY-MM-DD HH:mm:ss")}
            </p>
            <p>
              <strong>描述：</strong>
            </p>
            <p
              style={{
                padding: 12,
                background: "#f5f5f5",
                borderRadius: 4,
                wordBreak: "break-all",
              }}
            >
              {selectedAlert.description}
            </p>
            {selectedAlert.resolutionNotes && (
              <>
                <p>
                  <strong>处理备注：</strong>
                </p>
                <p style={{ padding: 12, background: "#f6ffed", borderRadius: 4 }}>
                  {selectedAlert.resolutionNotes}
                </p>
              </>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default SecurityAlerts;
