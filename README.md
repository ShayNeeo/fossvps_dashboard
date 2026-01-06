# FOSSVPS Dashboard

A premium, high-performance, futuristic "Command Center" dashboard for managing cross-node infrastructure. Unified management for Proxmox VE and Incus (LXD) nodes with real-time telemetry and integrated VNC console.

![Dashboard Preview](https://github.com/fossvps/dashboard/raw/main/preview.png)

## 🚀 Key Features

- **Unified Infrastructure Oversight**: Manage multiple Proxmox and Incus nodes from a single glassmorphic interface.
- **Real-time Telemetry**: Live CPU, RAM, and network usage charts powered by WebSockets and Recharts.
- **Embedded VNC Console**: Browser-based remote control for virtual machines using noVNC.
- **Cross-Node VM Discovery**: Automatically aggregate and manage VMs across your entire distributed network.
- **Modern Tech Stack**: Built with Next.js 14, Rust (Axum), and PostgreSQL for maximum performance and safety.
- **Premium Aesthetics**: High-end "Command Center" design with glassmorphism, dynamic animations (Framer Motion), and responsive layouts.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS v4, Shadcn UI
- **State Management**: TanStack Query (React Query)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React

### Backend
- **Language**: Rust
- **Web Framework**: Axum
- **Runtime**: Tokio
- **Database**: PostgreSQL (SQLx)
- **API Clients**: reqwest, tokio-tungstenite (WebSockets)
- **Auth**: JWT, Argon2

## 📦 Deployment

### Local Development (Docker)
1. Ensure you have Docker and Docker Compose installed.
2. Clone the repository and run:
   ```bash
   docker-compose up --build
   ```
3. Access the dashboard at `http://localhost:3000`.

### Production (Dokploy)
Refer to the [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions on deploying with Dokploy or other container orchestrators.

## 🤝 Support
For technical assistance or reporting issues, please submit a ticket through the in-app Support Center or email `support@fossvps.org`.

## 📜 License
This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](./LICENSE) file for details.

---
Copyright © 2026 FOSSVPS. Produced with ❤️ by the FOSSVPS Engineering Team.
