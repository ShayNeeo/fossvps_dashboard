import axios from "axios";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1";

export interface LoginResponse {
    access_token: string;
    refresh_token: string;
    user: {
        id: string;
        username: string;
        email: string;
        role: "admin" | "user";
    };
}

export const authService = {
    login: async (username: string, password: string): Promise<LoginResponse> => {
        const { data } = await axios.post<LoginResponse>(`${apiBaseUrl}/auth/login`, {
            username,
            password,
        });
        return data;
    },

    register: async (username: string, email: string, password: string) => {
        const { data } = await axios.post(`${apiBaseUrl}/auth/register`, {
            username,
            email,
            password,
        });
        return data;
    },

    logout: async () => {
        const token = localStorage.getItem("access_token");
        if (token) {
            try {
                await axios.post(`${apiBaseUrl}/auth/logout`, {}, {
                    headers: { Authorization: `Bearer ${token}` },
                });
            } catch (error) {
                console.error("Logout error:", error);
            }
        }
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
    },

    refresh: async (): Promise<LoginResponse> => {
        const refresh_token = localStorage.getItem("refresh_token");
        if (!refresh_token) {
            throw new Error("No refresh token");
        }

        const { data } = await axios.post<LoginResponse>(`${apiBaseUrl}/auth/refresh`, {
            refresh_token,
        });
        
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        
        return data;
    },

    getUser: () => {
        const userStr = localStorage.getItem("user");
        return userStr ? JSON.parse(userStr) : null;
    },

    getToken: () => {
        return localStorage.getItem("access_token");
    },

    isAuthenticated: () => {
        return !!localStorage.getItem("access_token");
    },
};
