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
    api_key?: string;
    api_secret?: string;
}

export interface VM {
    id: string;
    name: string;
    status: string;
    node_id: string;
    internal_id: string;
    vmid?: number;
    cpus?: number;
    memory?: number;
    maxmem?: number;
    node_name?: string;
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
    update: async (id: string, node: Partial<Omit<Node, "id" | "status">>) => {
        const { data } = await api.patch<Node>(`/nodes/${id}`, node);
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/nodes/${id}`);
        return data;
    },
};

export const vmService = {
    list: async () => {
        const { data } = await api.get<VM[]>("/vms");
        return data;
    },
    powerAction: async (node_id: string, vm_id: string, action: "start" | "stop" | "shutdown" | "reboot") => {
        const { data } = await api.post("/vms/power", { node_id, vm_id, action });
        return data;
    },
    updateConfig: async (node_id: string, vm_id: string, config: any) => {
        const { data } = await api.patch("/vms/config", { node_id, vm_id, config });
        return data;
    },
    getDetails: async (node_id: string, vm_id: string) => {
        const { data } = await api.get("/vms/details", { params: { node_id, vm_id } });
        return data;
    },
    mountMedia: async (node_id: string, vm_id: string, iso_path: string) => {
        const { data } = await api.post("/vms/media", { node_id, vm_id, iso_path });
        return data;
    },
};

export const supportService = {
    sendMessage: async (message: { subject: string, message: string, priority: string }) => {
        const { data } = await api.post("/support/message", message);
        return data;
    },
    getHistory: async () => {
        const { data } = await api.get("/support/history");
        return data;
    }
};
