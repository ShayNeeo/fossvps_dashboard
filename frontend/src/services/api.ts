import axios from "axios";

const api = axios.create({
    baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api/v1",
});

export interface Node {
    id: string;
    name: string;
    node_type: "proxmox" | "incus";
    api_url: string;
    status: "online" | "offline" | "error";
}

export interface VM {
    id: string;
    name: string;
    status: string;
    node_id: string;
    vmid?: number;
}

export const nodeService = {
    list: async () => {
        const { data } = await api.get<Node[]>("/nodes");
        return data;
    },
    create: async (node: Omit<Node, "id" | "status"> & { api_key: string, api_secret?: string }) => {
        const { data } = await api.post<Node>("/nodes", node);
        return data;
    },
};

export const vmService = {
    list: async () => {
        const { data } = await api.get<VM[]>("/vms");
        return data;
    },
    powerAction: async (id: string, action: "start" | "stop" | "shutdown" | "reboot") => {
        const { data } = await api.post(`/vms/${id}/power`, { action });
        return data;
    },
};
