import { create } from "zustand";
import api from "../services/api";

interface User {
  id: number;
  username: string;
  realName: string;
  email: string;
  phone: string;
  department: string;
  role: string;
  status: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  login: (username: string, password: string) => Promise<any>;
  verify2FA: (userId: number, code: string) => Promise<any>;
  logout: () => void;
  fetchUserInfo: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: localStorage.getItem("token"),
  isLoggedIn: !!localStorage.getItem("token"),

  login: async (username: string, password: string) => {
    const response = await api.post("/auth/login", { username, password });
    return response.data;
  },

  verify2FA: async (userId: number, code: string) => {
    const response = await api.post("/auth/2fa/verify", { userId, code });
    const { token, user } = response.data;
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ token, user, isLoggedIn: true });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null, isLoggedIn: false });
  },

  fetchUserInfo: async () => {
    try {
      const response = await api.get("/auth/me");
      set({ user: response.data });
      localStorage.setItem("user", JSON.stringify(response.data));
    } catch (error) {
      console.error("获取用户信息失败", error);
    }
  },
}));

const savedUser = localStorage.getItem("user");
if (savedUser) {
  useAuthStore.setState({ user: JSON.parse(savedUser) });
}
