import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAuthStore } from "./store/authStore";
import Login from "./pages/Login";
import MainLayout from "./components/MainLayout";
import Dashboard from "./pages/Dashboard";
import PasswordChange from "./pages/PasswordChange";
import RotationTasks from "./pages/RotationTasks";
import LoginLogs from "./pages/LoginLogs";
import Approvals from "./pages/Approvals";
import UserManagement from "./pages/UserManagement";
import Reports from "./pages/Reports";
import AuditLogs from "./pages/AuditLogs";
import SecurityAlerts from "./pages/SecurityAlerts";
import ImportPage from "./pages/ImportPage";
import SystemsPage from "./pages/SystemsPage";

function App() {
  const { isLoggedIn } = useAuthStore();

  return (
    <Router>
      <Routes>
        <Route
          path="/login"
          element={isLoggedIn ? <Navigate to="/" replace /> : <Login />}
        />
        <Route
          path="/"
          element={isLoggedIn ? <MainLayout /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Dashboard />} />
          <Route path="password" element={<PasswordChange />} />
          <Route path="rotation" element={<RotationTasks />} />
          <Route path="login-logs" element={<LoginLogs />} />
          <Route path="approvals" element={<Approvals />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="reports" element={<Reports />} />
          <Route path="audit" element={<AuditLogs />} />
          <Route path="alerts" element={<SecurityAlerts />} />
          <Route path="import" element={<ImportPage />} />
          <Route path="systems" element={<SystemsPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
