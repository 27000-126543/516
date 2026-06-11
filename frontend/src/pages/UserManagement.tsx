import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  Input,
  Modal,
  Form,
  message,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  EditOutlined,
  StopOutlined,
  PlayCircleOutlined,
  SearchOutlined,
} from "@ant-design/icons";
import api from "../services/api";
import dayjs from "dayjs";

const UserManagement: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [department, setDepartment] = useState<string | undefined>();
  const [role, setRole] = useState<string | undefined>();
  const [status, setStatus] = useState<string | undefined>();
  const [keyword, setKeyword] = useState("");
  const [departments, setDepartments] = useState<string[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchDepartments();
  }, []);

  useEffect(() => {
    fetchData();
  }, [page, pageSize, department, role, status, keyword]);

  const fetchDepartments = async () => {
    try {
      const response = await api.get("/users/departments");
      setDepartments(response.data.departments);
    } catch (error) {
      console.error("获取部门列表失败", error);
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      const params: any = { page, pageSize };
      if (department) params.department = department;
      if (role) params.role = role;
      if (status) params.status = status;
      if (keyword) params.keyword = keyword;

      const response = await api.get("/users", { params });
      setData(response.data.users);
      setTotal(response.data.total);
    } catch (error) {
      console.error("获取用户列表失败", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingUser(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingUser(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingUser) {
        await api.put(`/users/${editingUser.id}`, values);
        message.success("更新成功");
      } else {
        await api.post("/users", values);
        message.success("创建成功");
      }
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "操作失败");
    }
  };

  const handleDisable = async (id: number) => {
    try {
      await api.post(`/users/${id}/disable`);
      message.success("已禁用");
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "操作失败");
    }
  };

  const handleEnable = async (id: number) => {
    try {
      await api.post(`/users/${id}/enable`);
      message.success("已启用");
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "操作失败");
    }
  };

  const getRoleTag = (role: string) => {
    const roleMap: Record<string, { color: string; text: string }> = {
      admin: { color: "purple", text: "管理员" },
      director: { color: "red", text: "总监" },
      manager: { color: "orange", text: "经理" },
      employee: { color: "blue", text: "员工" },
    };
    const info = roleMap[role] || { color: "default", text: role };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      active: { color: "green", text: "正常" },
      disabled: { color: "default", text: "已禁用" },
      frozen: { color: "red", text: "已冻结" },
      pending: { color: "orange", text: "待审核" },
    };
    const info = statusMap[status] || { color: "default", text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getStrengthTag = (score: number) => {
    if (score <= 1) return <Tag color="red">弱</Tag>;
    if (score <= 2) return <Tag color="orange">中</Tag>;
    return <Tag color="green">强</Tag>;
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "用户名",
      dataIndex: "username",
      key: "username",
    },
    {
      title: "姓名",
      dataIndex: "realName",
      key: "realName",
    },
    {
      title: "部门",
      dataIndex: "department",
      key: "department",
    },
    {
      title: "角色",
      dataIndex: "role",
      key: "role",
      render: (role: string) => getRoleTag(role),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "密码强度",
      dataIndex: "passwordStrengthScore",
      key: "passwordStrengthScore",
      render: (score: number) => getStrengthTag(score),
    },
    {
      title: "上次修改密码",
      dataIndex: "lastPasswordChange",
      key: "lastPasswordChange",
      render: (date: string) => (date ? dayjs(date).format("YYYY-MM-DD") : "-"),
    },
    {
      title: "邮箱",
      dataIndex: "email",
      key: "email",
    },
    {
      title: "手机",
      dataIndex: "phone",
      key: "phone",
    },
    {
      title: "操作",
      key: "action",
      fixed: "right" as const,
      width: 180,
      render: (_: any, record: any) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            编辑
          </Button>
          {record.status === "active" ? (
            <Popconfirm
              title="确定禁用该用户吗？"
              onConfirm={() => handleDisable(record.id)}
            >
              <Button type="link" size="small" danger icon={<StopOutlined />}>
                禁用
              </Button>
            </Popconfirm>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<PlayCircleOutlined />}
              onClick={() => handleEnable(record.id)}
            >
              启用
            </Button>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="用户管理"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增用户
          </Button>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            placeholder="搜索用户名/姓名/邮箱"
            prefix={<SearchOutlined />}
            style={{ width: 250 }}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={fetchData}
          />
          <Select
            placeholder="筛选部门"
            style={{ width: 150 }}
            allowClear
            value={department}
            onChange={(v) => setDepartment(v)}
            options={departments.map((d) => ({ value: d, label: d }))}
          />
          <Select
            placeholder="筛选角色"
            style={{ width: 120 }}
            allowClear
            value={role}
            onChange={(v) => setRole(v)}
            options={[
              { value: "admin", label: "管理员" },
              { value: "director", label: "总监" },
              { value: "manager", label: "经理" },
              { value: "employee", label: "员工" },
            ]}
          />
          <Select
            placeholder="筛选状态"
            style={{ width: 120 }}
            allowClear
            value={status}
            onChange={(v) => setStatus(v)}
            options={[
              { value: "active", label: "正常" },
              { value: "disabled", label: "已禁用" },
              { value: "frozen", label: "已冻结" },
            ]}
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
          scroll={{ x: 1200 }}
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
        title={editingUser ? "编辑用户" : "新增用户"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="用户名"
            name="username"
            rules={[{ required: true, message: "请输入用户名" }]}
          >
            <Input placeholder="请输入用户名" disabled={!!editingUser} />
          </Form.Item>
          {!editingUser && (
            <Form.Item
              label="初始密码"
              name="password"
              rules={[{ required: true, message: "请输入初始密码" }]}
            >
              <Input.Password placeholder="请输入初始密码" />
            </Form.Item>
          )}
          <Form.Item
            label="姓名"
            name="realName"
            rules={[{ required: true, message: "请输入姓名" }]}
          >
            <Input placeholder="请输入姓名" />
          </Form.Item>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: "请输入邮箱" },
              { type: "email", message: "请输入有效的邮箱地址" },
            ]}
          >
            <Input placeholder="请输入邮箱" />
          </Form.Item>
          <Form.Item
            label="手机"
            name="phone"
            rules={[{ required: true, message: "请输入手机号" }]}
          >
            <Input placeholder="请输入手机号" />
          </Form.Item>
          <Form.Item
            label="部门"
            name="department"
            rules={[{ required: true, message: "请选择部门" }]}
          >
            <Input placeholder="请输入部门" />
          </Form.Item>
          <Form.Item
            label="角色"
            name="role"
            rules={[{ required: true, message: "请选择角色" }]}
          >
            <Select
              options={[
                { value: "admin", label: "管理员" },
                { value: "director", label: "总监" },
                { value: "manager", label: "经理" },
                { value: "employee", label: "员工" },
              ]}
            />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                确定
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default UserManagement;
