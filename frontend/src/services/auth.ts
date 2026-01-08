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
        // Send credentials and let server set HttpOnly cookies for tokens
        const { data } = await axios.post<LoginResponse>(`${apiBaseUrl}/auth/login`, {
            username,
            password,
        }, { withCredentials: true });
        // Persist tokens for WebSocket auth (cookies are HttpOnly)
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
        return data;
    },

    refresh: async (): Promise<LoginResponse> => {
        // Let server use refresh cookie to issue new tokens
        const { data } = await axios.post<LoginResponse>(`${apiBaseUrl}/auth/refresh`, {}, { withCredentials: true });
        localStorage.setItem("access_token", data.access_token);
        localStorage.setItem("refresh_token", data.refresh_token);
        localStorage.setItem("user", JSON.stringify(data.user));
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
        try {
            // Let server clear cookies
            await axios.post(`${apiBaseUrl}/auth/logout`, {}, { withCredentials: true });
        } catch (error) {
            console.error("Logout error:", error);
        }
        localStorage.removeItem("user");
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
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
