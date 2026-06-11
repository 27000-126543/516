import { useState, useEffect } from "react";
import { Card, Row, Col, Statistic, Button, Space, Table, Tag, message } from "antd";
import {
  FileExcelOutlined,
  FilePdfOutlined,
  ReloadOutlined,
  UserOutlined,
  WarningOutlined,
  LockOutlined,
  SafetyOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import api from "../services/api";

const Reports: React.FC = () => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    fetchReport();
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const response = await api.get("/reports/health");
      setReport(response.data.report);
    } catch (error) {
      console.error("获取报告失败", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const response = await api.get("/reports/health/export/excel", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `password-health-report-${new Date().toISOString().split("T")[0]}.xlsx`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success("Excel导出成功");
    } catch (error) {
      message.error("导出失败");
    } finally {
      setExporting(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const response = await api.get("/reports/health/export/pdf", {
        responseType: "blob",
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `password-health-report-${new Date().toISOString().split("T")[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      message.success("PDF导出成功");
    } catch (error) {
      message.error("导出失败");
    } finally {
      setExporting(false);
    }
  };

  const getTrendChartOption = () => {
    if (!report?.trends?.last7Days) return {};
    const data = report.trends.last7Days;
    return {
      tooltip: { trigger: "axis" },
      legend: { data: ["异常登录", "密码变更", "安全告警"] },
      xAxis: {
        type: "category",
        data: data.map((d: any) => d.date),
      },
      yAxis: { type: "value" },
      series: [
        {
          name: "异常登录",
          type: "line",
          data: data.map((d: any) => d.abnormalLogins),
          smooth: true,
          itemStyle: { color: "#ff4d4f" },
          areaStyle: { opacity: 0.1 },
        },
        {
          name: "密码变更",
          type: "line",
          data: data.map((d: any) => d.passwordChanges),
          smooth: true,
          itemStyle: { color: "#52c41a" },
          areaStyle: { opacity: 0.1 },
        },
        {
          name: "安全告警",
          type: "line",
          data: data.map((d: any) => d.securityAlerts),
          smooth: true,
          itemStyle: { color: "#faad14" },
          areaStyle: { opacity: 0.1 },
        },
      ],
    };
  };

  const getSystemChartOption = () => {
    if (!report?.systemBreakdown) return {};
    const data = report.systemBreakdown;
    return {
      tooltip: { trigger: "axis" },
      legend: { data: ["弱密码数", "轮换完成率(%)", "异常登录次数"] },
      xAxis: {
        type: "category",
        data: data.map((d: any) => d.systemName),
      },
      yAxis: [{ type: "value" }, { type: "value", max: 100 }],
      series: [
        {
          name: "弱密码数",
          type: "bar",
          data: data.map((d: any) => d.weakPasswordCount),
          itemStyle: { color: "#faad14" },
        },
        {
          name: "轮换完成率(%)",
          type: "line",
          yAxisIndex: 1,
          data: data.map((d: any) => d.rotationCompletionRate),
          itemStyle: { color: "#52c41a" },
          smooth: true,
        },
        {
          name: "异常登录次数",
          type: "bar",
          data: data.map((d: any) => d.abnormalLoginCount),
          itemStyle: { color: "#ff4d4f" },
        },
      ],
    };
  };

  const systemColumns = [
    {
      title: "系统名称",
      dataIndex: "systemName",
      key: "systemName",
    },
    {
      title: "弱密码数",
      dataIndex: "weakPasswordCount",
      key: "weakPasswordCount",
      render: (v: number) => <Tag color={v > 0 ? "orange" : "green"}>{v}</Tag>,
    },
    {
      title: "轮换完成率",
      dataIndex: "rotationCompletionRate",
      key: "rotationCompletionRate",
      render: (v: number) => `${v}%`,
    },
    {
      title: "异常登录次数",
      dataIndex: "abnormalLoginCount",
      key: "abnormalLoginCount",
      render: (v: number) => <Tag color={v > 0 ? "red" : "green"}>{v}</Tag>,
    },
  ];

  return (
    <div>
      <Card
        title="密码健康报告"
        extra={
          <Space>
            <Button icon={<ReloadOutlined />} onClick={fetchReport} loading={loading}>
              刷新
            </Button>
            <Button
              icon={<FileExcelOutlined />}
              onClick={handleExportExcel}
              loading={exporting}
            >
              导出Excel
            </Button>
            <Button
              icon={<FilePdfOutlined />}
              onClick={handleExportPDF}
              loading={exporting}
              type="primary"
            >
              导出PDF
            </Button>
          </Space>
        }
      >
        <Row gutter={[16, 16]}>
          <Col span={6}>
            <Card>
              <Statistic
                title="用户总数"
                value={report?.totalUsers || 0}
                prefix={<UserOutlined style={{ color: "#1890ff" }} />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="弱密码账号"
                value={report?.weakPasswordCount || 0}
                valueStyle={{ color: "#faad14" }}
                prefix={<WarningOutlined />}
                suffix={
                  <span style={{ fontSize: 14, color: "#999" }}>
                    ({report?.weakPasswordRatio?.toFixed(1)}%)
                  </span>
                }
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="密码轮换完成率"
                value={report?.rotationCompletionRate || 0}
                suffix="%"
                valueStyle={{ color: "#52c41a" }}
                prefix={<LockOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="异常登录次数"
                value={report?.abnormalLoginCount || 0}
                valueStyle={{ color: "#ff4d4f" }}
                prefix={<ExclamationCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="待处理轮换任务"
                value={report?.pendingRotationTasks || 0}
                valueStyle={{ color: "#1890ff" }}
                prefix={<LockOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="逾期轮换任务"
                value={report?.overdueRotationTasks || 0}
                valueStyle={{ color: "#ff4d4f" }}
                prefix={<WarningOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="冻结账号"
                value={report?.frozenAccountCount || 0}
                valueStyle={{ color: "#722ed1" }}
                prefix={<SafetyOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="禁用账号"
                value={report?.disabledAccountCount || 0}
                valueStyle={{ color: "#666" }}
                prefix={<LockOutlined />}
              />
            </Card>
          </Col>
        </Row>

        <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
          <Col span={12}>
            <Card title="近7日安全趋势">
              <ReactECharts option={getTrendChartOption()} style={{ height: 300 }} />
            </Card>
          </Col>
          <Col span={12}>
            <Card title="各系统安全对比">
              <ReactECharts option={getSystemChartOption()} style={{ height: 300 }} />
            </Card>
          </Col>
        </Row>

        <Card title="各系统明细" style={{ marginTop: 16 }}>
          <Table
            columns={systemColumns}
            dataSource={report?.systemBreakdown || []}
            rowKey="systemId"
            pagination={false}
          />
        </Card>

        <Card title="安全告警统计" style={{ marginTop: 16 }}>
          <Row gutter={16}>
            <Col span={6}>
              <Statistic
                title="严重告警"
                value={report?.securityAlerts?.critical || 0}
                valueStyle={{ color: "#722ed1" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="高危告警"
                value={report?.securityAlerts?.high || 0}
                valueStyle={{ color: "#ff4d4f" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="中危告警"
                value={report?.securityAlerts?.medium || 0}
                valueStyle={{ color: "#faad14" }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="低危告警"
                value={report?.securityAlerts?.low || 0}
                valueStyle={{ color: "#52c41a" }}
              />
            </Col>
          </Row>
        </Card>
      </Card>
    </div>
  );
};

export default Reports;
