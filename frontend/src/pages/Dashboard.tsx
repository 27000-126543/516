import { useState, useEffect } from "react";
import { Row, Col, Card, Statistic, Progress, Table, Tag, Space } from "antd";
import {
  UserOutlined,
  WarningOutlined,
  LockOutlined,
  SafetyOutlined,
  RiseOutlined,
  ExclamationCircleOutlined,
} from "@ant-design/icons";
import ReactECharts from "echarts-for-react";
import api from "../services/api";
import { useAuthStore } from "../store/authStore";
import dayjs from "dayjs";

const Dashboard: React.FC = () => {
  const { user } = useAuthStore();
  const [reportData, setReportData] = useState<any>(null);
  const [passwordInfo, setPasswordInfo] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [reportRes, passwordRes] = await Promise.all([
        api.get("/reports/health"),
        api.get("/password/strength"),
      ]);
      setReportData(reportRes.data.report);
      setPasswordInfo(passwordRes.data);
    } catch (error) {
      console.error("获取数据失败", error);
    } finally {
      setLoading(false);
    }
  };

  const getTrendChartOption = () => {
    if (!reportData?.trends?.last7Days) return {};
    const data = reportData.trends.last7Days;
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
        },
        {
          name: "密码变更",
          type: "line",
          data: data.map((d: any) => d.passwordChanges),
          smooth: true,
          itemStyle: { color: "#52c41a" },
        },
        {
          name: "安全告警",
          type: "line",
          data: data.map((d: any) => d.securityAlerts),
          smooth: true,
          itemStyle: { color: "#faad14" },
        },
      ],
    };
  };

  const getSystemChartOption = () => {
    if (!reportData?.systemBreakdown) return {};
    const data = reportData.systemBreakdown;
    return {
      tooltip: { trigger: "axis" },
      legend: { data: ["弱密码数", "异常登录次数"] },
      xAxis: {
        type: "category",
        data: data.map((d: any) => d.systemName),
      },
      yAxis: { type: "value" },
      series: [
        {
          name: "弱密码数",
          type: "bar",
          data: data.map((d: any) => d.weakPasswordCount),
          itemStyle: { color: "#faad14" },
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

  const getStrengthLabel = (score: number) => {
    const labels = ["非常弱", "弱", "中等", "强", "非常强"];
    return labels[score] || "未知";
  };

  const getStrengthColor = (score: number) => {
    const colors = ["#ff4d4f", "#fa8c16", "#faad14", "#52c41a", "#73d13d"];
    return colors[score] || "#999";
  };

  return (
    <div>
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="用户总数"
              value={reportData?.totalUsers || 0}
              prefix={<UserOutlined style={{ color: "#1890ff" }} />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="弱密码账号"
              value={reportData?.weakPasswordCount || 0}
              valueStyle={{ color: "#faad14" }}
              prefix={<WarningOutlined />}
              suffix={
                <span style={{ fontSize: 14, color: "#999" }}>
                  ({reportData?.weakPasswordRatio?.toFixed(1)}%)
                </span>
              }
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="待处理轮换任务"
              value={reportData?.pendingRotationTasks || 0}
              valueStyle={{ color: "#1890ff" }}
              prefix={<LockOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="冻结账号"
              value={reportData?.frozenAccountCount || 0}
              valueStyle={{ color: "#ff4d4f" }}
              prefix={<ExclamationCircleOutlined />}
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
          <Card title="各系统安全状况">
            <ReactECharts option={getSystemChartOption()} style={{ height: 300 }} />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col span={12}>
          <Card title="我的密码状态">
            {passwordInfo && (
              <Space direction="vertical" style={{ width: "100%" }} size="large">
                <div>
                  <div style={{ marginBottom: 8 }}>
                    密码强度:{" "}
                    <Tag color={getStrengthColor(passwordInfo.strengthScore)}>
                      {getStrengthLabel(passwordInfo.strengthScore)}
                    </Tag>
                  </div>
                  <Progress
                    percent={passwordInfo.strengthScore * 25}
                    strokeColor={getStrengthColor(passwordInfo.strengthScore)}
                    showInfo={false}
                  />
                </div>
                <div>
                  <div style={{ marginBottom: 8 }}>密码安全状态</div>
                  {passwordInfo.isExpired ? (
                    <Tag color="red">已过期</Tag>
                  ) : passwordInfo.isExpiringSoon ? (
                    <Tag color="orange">即将到期 ({passwordInfo.daysUntilExpiry}天)</Tag>
                  ) : (
                    <Tag color="green">正常 ({passwordInfo.daysUntilExpiry}天后到期)</Tag>
                  )}
                </div>
                <div>
                  <div style={{ marginBottom: 8 }}>上次修改</div>
                  <span style={{ color: "#666" }}>
                    {passwordInfo.daysSinceChange} 天前
                  </span>
                </div>
              </Space>
            )}
          </Card>
        </Col>
        <Col span={12}>
          <Card title="安全告警概览">
            {reportData?.securityAlerts && (
              <Row gutter={[16, 16]}>
                <Col span={12}>
                  <Statistic
                    title="严重"
                    value={reportData.securityAlerts.critical}
                    valueStyle={{ color: "#722ed1" }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="高危"
                    value={reportData.securityAlerts.high}
                    valueStyle={{ color: "#ff4d4f" }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="中危"
                    value={reportData.securityAlerts.medium}
                    valueStyle={{ color: "#faad14" }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="低危"
                    value={reportData.securityAlerts.low}
                    valueStyle={{ color: "#52c41a" }}
                  />
                </Col>
              </Row>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default Dashboard;
