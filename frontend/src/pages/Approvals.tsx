import { useState, useEffect } from "react";
import {
  Card,
  Table,
  Tag,
  Space,
  Button,
  Select,
  Modal,
  Form,
  Input,
  message,
  Tabs,
  Popconfirm,
} from "antd";
import {
  PlusOutlined,
  CheckOutlined,
  CloseOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import dayjs from "dayjs";

const { TextArea } = Input;

const Approvals: React.FC = () => {
  const { user } = useAuthStore();
  const [myRequests, setMyRequests] = useState<any[]>([]);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [form] = Form.useForm();
  const [rejectForm] = Form.useForm();
  const [rejectVisible, setRejectVisible] = useState(false);
  const [activeTab, setActiveTab] = useState("my");

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === "my") {
        const response = await api.get("/approvals", { params: { type: "my" } });
        setMyRequests(response.data.requests);
      } else {
        const response = await api.get("/approvals", { params: { type: "pending" } });
        setPendingApprovals(response.data.requests);
      }
    } catch (error) {
      console.error("获取申请列表失败", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      await api.post("/approvals", values);
      message.success("申请已提交");
      setModalVisible(false);
      form.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "提交失败");
    }
  };

  const handleApprove = async (id: number) => {
    try {
      await api.post(`/approvals/${id}/approve`, { comments: "" });
      message.success("审批通过");
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "审批失败");
    }
  };

  const handleReject = async (values: any) => {
    try {
      await api.post(`/approvals/${selectedRequest.id}/reject`, {
        rejectionReason: values.rejectionReason,
      });
      message.success("已驳回");
      setRejectVisible(false);
      rejectForm.resetFields();
      fetchData();
    } catch (error: any) {
      message.error(error.response?.data?.message || "操作失败");
    }
  };

  const getStatusTag = (status: string) => {
    const statusMap: Record<string, { color: string; text: string }> = {
      pending: { color: "blue", text: "待审批" },
      approved: { color: "green", text: "已通过" },
      rejected: { color: "red", text: "已驳回" },
      cancelled: { color: "default", text: "已取消" },
    };
    const info = statusMap[status] || { color: "default", text: status };
    return <Tag color={info.color}>{info.text}</Tag>;
  };

  const getTypeLabel = (type: string) => {
    const typeMap: Record<string, string> = {
      password_reset: "密码重置",
      account_unlock: "账号解锁",
      permission_restore: "权限恢复",
    };
    return typeMap[type] || type;
  };

  const getPriorityTag = (priority: string) => {
    const priorityMap: Record<string, string> = {
      low: "green",
      medium: "blue",
      high: "orange",
      urgent: "red",
    };
    const labelMap: Record<string, string> = {
      low: "低",
      medium: "中",
      high: "高",
      urgent: "紧急",
    };
    return <Tag color={priorityMap[priority] || "default"}>{labelMap[priority] || priority}</Tag>;
  };

  const columns = [
    {
      title: "ID",
      dataIndex: "id",
      key: "id",
      width: 80,
    },
    {
      title: "申请类型",
      dataIndex: "requestType",
      key: "requestType",
      render: (type: string) => getTypeLabel(type),
    },
    {
      title: "申请人",
      dataIndex: "requesterName",
      key: "requesterName",
    },
    {
      title: "部门",
      dataIndex: "department",
      key: "department",
    },
    {
      title: "优先级",
      dataIndex: "priority",
      key: "priority",
      render: (p: string) => getPriorityTag(p),
    },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (status: string) => getStatusTag(status),
    },
    {
      title: "当前审批人",
      dataIndex: "currentApproverName",
      key: "currentApproverName",
      render: (name: string) => name || "-",
    },
    {
      title: "审批进度",
      key: "progress",
      render: (_: any, record: any) => (
        <span>
          {record.approvalLevel}/{record.totalLevels} 级
        </span>
      ),
    },
    {
      title: "申请时间",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (date: string) => dayjs(date).format("YYYY-MM-DD HH:mm"),
    },
    {
      title: "操作",
      key: "action",
      render: (_: any, record: any) => (
        <Space>
          <Button size="small" onClick={() => viewDetail(record)}>
            详情
          </Button>
          {activeTab === "pending" && record.status === "pending" && (
            <>
              <Button
                type="primary"
                size="small"
                icon={<CheckOutlined />}
                onClick={() => handleApprove(record.id)}
              >
                通过
              </Button>
              <Button
                danger
                size="small"
                icon={<CloseOutlined />}
                onClick={() => {
                  setSelectedRequest(record);
                  setRejectVisible(true);
                }}
              >
                驳回
              </Button>
            </>
          )}
        </Space>
      ),
    },
  ];

  const viewDetail = (record: any) => {
    setSelectedRequest(record);
    setDetailModalVisible(true);
  };

  const tabItems = [
    {
      key: "my",
      label: "我的申请",
    },
    {
      key: "pending",
      label: "待我审批",
    },
  ];

  return (
    <div>
      <Card
        title="审批中心"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
            提交申请
          </Button>
        }
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />

        <Table
          columns={columns}
          dataSource={activeTab === "my" ? myRequests : pendingApprovals}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 20 }}
        />
      </Card>

      <Modal
        title="提交申请"
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="申请类型"
            name="requestType"
            rules={[{ required: true, message: "请选择申请类型" }]}
          >
            <Select
              placeholder="请选择申请类型"
              options={[
                { value: "password_reset", label: "密码重置" },
                { value: "account_unlock", label: "账号解锁" },
                { value: "permission_restore", label: "权限恢复" },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="优先级"
            name="priority"
            initialValue="medium"
          >
            <Select
              options={[
                { value: "low", label: "低" },
                { value: "medium", label: "中" },
                { value: "high", label: "高" },
                { value: "urgent", label: "紧急" },
              ]}
            />
          </Form.Item>
          <Form.Item
            label="申请原因"
            name="reason"
            rules={[{ required: true, message: "请填写申请原因" }]}
          >
            <TextArea rows={4} placeholder="请详细描述申请原因" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                提交
              </Button>
              <Button onClick={() => setModalVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      <Modal
        title="申请详情"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            关闭
          </Button>,
        ]}
        width={600}
      >
        {selectedRequest && (
          <div>
            <p><strong>申请类型：</strong>{getTypeLabel(selectedRequest.requestType)}</p>
            <p><strong>申请人：</strong>{selectedRequest.requesterName}</p>
            <p><strong>部门：</strong>{selectedRequest.department}</p>
            <p><strong>优先级：</strong>{getPriorityTag(selectedRequest.priority)}</p>
            <p><strong>状态：</strong>{getStatusTag(selectedRequest.status)}</p>
            <p><strong>当前审批人：</strong>{selectedRequest.currentApproverName || "-"}</p>
            <p><strong>审批进度：</strong>{selectedRequest.approvalLevel}/{selectedRequest.totalLevels} 级</p>
            <p><strong>申请原因：</strong></p>
            <p style={{ padding: 12, background: "#f5f5f5", borderRadius: 4 }}>
              {selectedRequest.reason}
            </p>
            {selectedRequest.rejectionReason && (
              <>
                <p><strong>驳回原因：</strong></p>
                <p style={{ padding: 12, background: "#fff2f0", borderRadius: 4, color: "#ff4d4f" }}>
                  {selectedRequest.rejectionReason}
                </p>
              </>
            )}
          </div>
        )}
      </Modal>

      <Modal
        title="驳回申请"
        open={rejectVisible}
        onCancel={() => setRejectVisible(false)}
        footer={null}
      >
        <Form form={rejectForm} layout="vertical" onFinish={handleReject}>
          <Form.Item
            label="驳回原因"
            name="rejectionReason"
            rules={[{ required: true, message: "请填写驳回原因" }]}
          >
            <TextArea rows={4} placeholder="请填写驳回原因" />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button danger type="primary" htmlType="submit">
                确认驳回
              </Button>
              <Button onClick={() => setRejectVisible(false)}>取消</Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default Approvals;
