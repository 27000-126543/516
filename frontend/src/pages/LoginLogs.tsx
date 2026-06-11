import { useState, useEffect } from "react";
import { Card, Table, Tag, Space, Select, DatePicker, Button, message } from "antd";
import { UnlockOutlined } from "@ant-design/icons";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const LoginLogs: React.FC = () => {
  const { user } = useAuthStore();
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [isAbnormal, setIsAbnormal] = useState<boolean | undefined>();
  const [systemId, setSystemId] = useState<number | undefined>();
  const [systems, setSystems] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState<any>(null);

  useEffect(() => {
    fetchSystems();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, isAbnormal, systemId, dateRange]);

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
      if (isAbnormal !== undefined) params.isAbnormal = isAbnormal;
      if (systemId) params.systemId = systemId;
      if (dateRange && dateRange.length === 2) {
        params.startTime = dateRange[0].toISOString();
        params.endTime = dateRange[1].toISOString();
      }

      const response = await api.get("/login-logs", { params });
      setData(response.data.logs);
      setTotal(response.data.total);
    } catch (error) {
      console.error("获取登录日志失败", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnfreeze = async (userId: number) => {
    try {
      await api.post(`/login-logs/${userId}/unfreeze`);
      message.success("账号已解冻");
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "解冻失败");
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      success: { color: "green", text: "成功" },
      failed: { color: "red", text: "失败" },
      pending_2fa: { color: "orange", text: "待二次认证" },
      blocked: { color: "default", text: "已阻止" },
    };
    const info = statusMap[status] || { color: "default", text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getAbnormalTag = (type: string, isAbnormal: boolean) => {
    if (!isAbnormal) return <Tag color="green">正常</Tag>;
    const typeMap: Record<string, string> = {
      non_working_hours: "非工作时间",
      unusual_location: "异地IP",
      multiple_failures: "多次失败",
      new_device: "新设备",
    };
    return <Tag color="red">{typeMap[type] || type}</Tag>;
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
      title: "IP地址",
      dataIndex: "ipAddress",
      key: "ipAddress",
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "异常类型",
      dataIndex: "abnormalType",
      key: "abnormalType",
      render: (type: string, record: any) => getAbnormalTag(type, record.isAbnormal),
    },
    {
      title: "二次认证",
      dataIndex: "twoFactorVerified",
      key: "twoFactorVerified",
      render: (verified: boolean) => (verified ? "已通过" : "-"),
    },
    {
      title: "失败原因",
      dataIndex: "failureReason",
      key: "failureReason",
      render: (reason: string) => reason || "-",
    },
    {
      title: "登录时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  return (
    <div>
      <Card title="登录日志">
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="登录状态"
            style={{ width: 150 }}
            allowClear
            value={isAbnormal === undefined ? undefined : isAbnormal ? "abnormal" : "normal"}
            onChange={(v) => {
              if (v === "abnormal") setIsAbnormal(true);
              else if (v === "normal") setIsAbnormal(false);
              else setIsAbnormal(undefined);
            }}
            options={[
              { value: "normal", label: "正常登录" },
              { value: "abnormal", label: "异常登录" },
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
          <RangePicker
            showTime
            value={dateRange}
            onChange={(v) => setDateRange(v)}
          />
          <Button type="primary" onClick={fetchData}>
            查询
          </Button>
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

export default LoginLogs;
