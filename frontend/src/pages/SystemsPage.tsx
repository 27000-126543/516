import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Button,
  Space,
  Modal,
  Form,
  Input,
  InputNumber,
  Switch,
  message,
  Tag,
} from "antd";
import { PlusOutlined, EditOutlined, SettingOutlined } from "@ant-design/icons";
import api from "../services/api";

const SystemsPage: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingSystem, setEditingSystem] = useState<any>(null);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/systems");
      setData(response.data.systems);
    } catch (error) {
      console.error("获取系统列表失败", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingSystem(null);
    form.resetFields();
    form.setFieldsValue({ isActive: true, passwordRotationDays: 90, reminderDaysBeforeExpiry: 7, disableAfterHours: 24 });
    setModalVisible(true);
  };

  const handleEdit = (record: any) => {
    setEditingSystem(record);
    form.setFieldsValue(record);
    setModalVisible(true);
  };

  const handleSubmit = async (values: any) => {
    try {
      if (editingSystem) {
        await api.put(`/admin/systems/${editingSystem.id}`, values);
        message.success("更新成功");
      } else {
        await api.post("/admin/systems", values);
        message.success("创建成功");
      }
      setModalVisible(false);
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "操作失败");
    }
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 60,
    },
    {
      title: "系统编码",
      dataIndex: "systemCode",
      key: "systemCode",
      width: 120,
    },
    {
      title: "系统名称",
      dataIndex: "systemName",
      key: "systemName",
    },
    {
      title: "描述",
      dataIndex: "description",
      key: "description",
      ellipsis: true,
      render: (v: string) => v || "-",
    },
    {
      title: "密码轮换周期(天)",
      dataIndex: "passwordRotationDays",
      key: "passwordRotationDays",
      width: 150,
      render: (v: number) => <Tag color="blue">{v} 天</Tag>,
    },
    {
      title: "到期提醒(天)",
      dataIndex: "reminderDaysBeforeExpiry",
      key: "reminderDaysBeforeExpiry",
      width: 120,
      render: (v: number) => <Tag color="orange">提前 {v} 天</Tag>,
    },
    {
      title: "逾期禁用(小时)",
      dataIndex: "disableAfterHours",
      key: "disableAfterHours",
      width: 130,
      render: (v: number) => <Tag color="red">{v} 小时后</Tag>,
    },
    {
      title: "状态",
      dataIndex: "isActive",
      key: "isActive",
      width: 100,
      render: (active: boolean) =>
        active ? <Tag color="green">启用</Tag> : <Tag color="default">停用</Tag>,
    },
    {
      title: "操作",
      key: "action",
      width: 100,
      fixed: "right" as const,
      render: (_: any, record: any) => (
        <Button
          type="link"
          size="small"
          icon={<EditOutlined />}
          onClick={() => handleEdit(record)}
        >
          编辑
        </Button>
      ),
    },
  ];

  return (
    <div>
      <Card
        title="系统配置"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            新增系统
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1000 }}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title={editingSystem ? "编辑系统" : "新增系统"}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="系统编码"
            name="systemCode"
            rules={[{ required: true, message: "请输入系统编码" }]}
          >
            <Input placeholder="请输入系统编码，如OA、ERP" disabled={!!editingSystem} />
          </Form.Item>
          <Form.Item
            label="系统名称"
            name="systemName"
            rules={[{ required: true, message: "请输入系统名称" }]}
          >
            <Input placeholder="请输入系统名称" />
          </Form.Item>
          <Form.Item label="描述" name="description">
            <Input.TextArea rows={3} placeholder="请输入系统描述" />
          </Form.Item>
          <Space size="large" style={{ width: "100%" }}>
            <Form.Item
              label="密码轮换周期(天)"
              name="passwordRotationDays"
              rules={[{ required: true, message: "请输入轮换周期" }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} max={365} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label="到期提醒(天)"
              name="reminderDaysBeforeExpiry"
              rules={[{ required: true, message: "请输入提醒天数" }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} max={30} style={{ width: "100%" }} />
            </Form.Item>
            <Form.Item
              label="逾期禁用(小时)"
              name="disableAfterHours"
              rules={[{ required: true, message: "请输入禁用小时数" }]}
              style={{ flex: 1 }}
            >
              <InputNumber min={1} max={720} style={{ width: "100%" }} />
            </Form.Item>
          </Space>
          <Form.Item
            label="启用状态"
            name="isActive"
            valuePropName="checked"
          >
            <Switch />
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

export default SystemsPage;
