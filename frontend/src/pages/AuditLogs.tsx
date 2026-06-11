import { useState, useEffect } from "react";
import { Card, Table, Tag, Space, Select, DatePicker, Input, Button } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import api from "../services/api";
import dayjs from "dayjs";

const { RangePicker } = DatePicker;

const AuditLogs: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [action, setAction] = useState<string | undefined>();
  const [level, setLevel] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");
  const [dateRange, setDateRange] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, action, level, keyword, dateRange]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (action) params.action = action;
      if (level) params.level = level;
      if (dateRange && dateRange.length === 2) {
        params.startTime = dateRange[0].toISOString();
        params.endTime = dateRange[1].toISOString();
      }

      const response = await api.get("/audit", { params });
      setData(response.data.logs);
      setTotal(response.data.total);
    } catch (error) {
      console.error("获取审计日志失败", error);
    } finally {
      setLoading(false);
    }
  };

  const getLevelTag = (level: string) => {
    const levelMap: Record<string, { color: string; text: string }> = {
      info: { color: "blue", text: "信息" },
      warning: { color: "orange", text: "警告" },
      danger: { color: "red", text: "危险" },
      critical: { color: "purple", text: "严重" },
    };
    const info = levelMap[level] || { color: "default", text: level };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getActionLabel = (action: string) => {
    const actionMap: Record<string, string> = {
      login: "登录",
      logout: "登出",
      password_change: "修改密码",
      password_reset: "重置密码",
      account_create: "创建账号",
      account_disable: "禁用账号",
      account_enable: "启用账号",
      account_freeze: "冻结账号",
      account_unfreeze: "解冻账号",
      policy_update: "更新策略",
      batch_import: "批量导入",
      approval_create: "创建审批",
      approval_approve: "审批通过",
      approval_reject: "审批驳回",
      report_generate: "生成报告",
      two_factor_auth: "二次认证",
      system_config_update: "系统配置更新",
    };
    return actionMap[action] || action;
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "用户",
      dataIndex: "username",
      key: "username",
      width: 120,
      render: (v: string) => v || "-",
    },
    {
      title: "操作",
      dataIndex: "action",
      key: "action",
      width: 140,
      render: (action: string) => getActionLabel(action),
    },
    {
      title: "级别",
      dataIndex: "level",
      key: "level",
      width: 100,
      render: (level: string) => getLevelTag(level),
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
    },
    {
      title: "IP地址",
      dataIndex: "ipAddress",
      key: "ipAddress",
      width: 140,
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
      title: "时间",
      dataIndex: "createdAt",
      key: "createdAt",
      width: 180,
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm:ss"),
    },
  ];

  const actionOptions = [
    { value: "login", label: "登录" },
    { value: "logout", label: "登出" },
    { value: "password_change", label: "修改密码" },
    { value: "password_reset", label: "重置密码" },
    { value: "account_create", label: "创建账号" },
    { value: "account_disable", label: "禁用账号" },
    { value: "account_enable", label: "启用账号" },
    { value: "account_freeze", label: "冻结账号" },
    { value: "account_unfreeze", label: "解冻账号" },
    { value: "batch_import", label: "批量导入" },
    { value: "approval_create", label: "创建审批" },
    { value: "approval_approve", label: "审批通过" },
    { value: "approval_reject", label: "审批驳回" },
    { value: "report_generate", label: "生成报告" },
    { value: "two_factor_auth", label: "二次认证" },
  ];

  return (
    <div>
      <Card title="审计日志">
        <Space style={{ marginBottom: 16 }} wrap>
          <Select
            placeholder="操作类型"
            style={{ width: 160 }}
            allowClear
            showSearch
            value={action}
            onChange={(v) => setAction(v)}
            options={actionOptions}
          />
          <Select
            placeholder="级别"
            style={{ width: 120 }}
            allowClear
            value={level}
            onChange={(v) => setLevel(v)}
            options={[
              { value: "info", label: "信息" },
              { value: "warning", label: "警告" },
              { value: "danger", label: "危险" },
              { value: "critical", label: "严重" },
            ]}
          />
          <RangePicker
            showTime
            value={dateRange}
            onChange={(v) => setDateRange(v)}
          />
          <Input
            placeholder="搜索描述"
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={fetchData}
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
          scroll={{ x: 1000 }}
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

export default AuditLogs;
