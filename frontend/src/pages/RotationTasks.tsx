import { useState, useEffect } from "react";
import { Card, Table, Tag, Space, Button, Select, DatePicker, message } from "antd";
import { ReloadOutlined, PlayCircleOutlined } from "@ant-design/icons";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const RotationTasks: React.FC = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [status, setStatus] = useState<string | undefined>();
  const [systemId, setSystemId] = useState<number | undefined>();
  const [systems, setSystems] = useState<any[]>([]);

  useEffect(() => {
    fetchSystems();
    fetchData();
  }, [page, pageSize, status, systemId]);

  const fetchSystems = async () => {
    try {
      const response = await api.get("/admin/systems");
      setSystems(response.data.systems);
    } catch (error) {
      console.error("获取系统列表失败", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (status) params.status = status;
      if (systemId) params.systemId = systemId;

      const response = await api.get("/rotation", { params });
      setData(response.data.tasks);
      setTotal(response.data.total);
    } catch (error) {
      console.error("获取任务列表失败", error);
    } finally {
      setLoading(false);
    }
  };

  const handleScan = async () => {
    try {
      await api.post("/rotation/scan");
      message.success("扫描完成");
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "扫描失败");
    }
  };

  const handleChangePassword = (task: any) => {
    window.location.href = "/password?taskId=" + task.id;
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: "blue", text: "待处理" },
      in_progress: { color: "processing", text: "进行中" },
      completed: { color: "green", text: "已完成" },
      overdue: { color: "red", text: "已逾期" },
      disabled: { color: "default", text: "已禁用" },
    };
    const info = statusMap[status] || { color: "default", text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "用户ID",
      dataIndex: "userId",
      key: "userId",
      width: 100,
    },
    {
      title: "系统ID",
      dataIndex: "systemId",
      key: "systemId",
      width: 100,
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "截止日期",
      dataIndex: "dueDate",
      key: "dueDate",
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "短信提醒",
      dataIndex: "smsSent",
      key: "smsSent",
      render: (sent: boolean) => (sent ? "已发送" : "未发送"),
    },
    {
      title: "完成时间",
      dataIndex: "completedAt",
      key: "completedAt",
      render: (date: string) => (date ? dayjs(date).format("YYYY-MM-DD HH:mm") : "-"),
    },
    {
      title: "创建时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: any) => (
        <Space>
          {record.status === "pending" || record.status === "overdue" ? (
            <Button
              type="primary"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleChangePassword(record)}
            >
              修改密码
            </Button>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="密码轮换任务"
        extra={
          <Space>
            {user?.role === "admin" && (
              <Button icon={<ReloadOutlined />} onClick={handleScan}>
                立即扫描
              </Button>
            )}
          </Space>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="筛选状态"
            style={{ width: 150 }}
            allowClear
            value={status}
            onChange={(v) => setStatus(v)}
            options={[
              { value: "pending", label: "待处理" },
              { value: "in_progress", label: "进行中" },
              { value: "completed", label: "已完成" },
              { value: "overdue", label: "已逾期" },
              { value: "disabled", label: "已禁用" },
            ]}
          />
          <Select
            placeholder="筛选系统"
            style={{ width: 150 }}
            allowClear
            value={systemId}
            onChange={(v) => setSystemId(v)}
            options={systems.map((s) => ({ value: s.id, label: s.systemName }))}
          />
        </Space>

        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
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
    </div>
  );
};

export default RotationTasks;
