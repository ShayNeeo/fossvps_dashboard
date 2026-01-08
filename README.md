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
- **Secure Authentication**: JWT-based authentication with role-based access control (Admin/User roles).
- **Production Ready**: Docker-based deployment, health checks, and comprehensive monitoring.

## 🛠️ Technology Stack

### Frontend
- **Framework**: Next.js 14+ (App Router)
- **Styling**: Tailwind CSS v4, Shadcn UI
- **State Management**: TanStack Query (React Query)
- **Animations**: Framer Motion
- **Charts**: Recharts
- **Icons**: Lucide React
- **Auth**: JWT with automatic token refresh

### Backend
- **Language**: Rust
- **Web Framework**: Axum
- **Runtime**: Tokio
- **Database**: PostgreSQL (SQLx)
- **API Clients**: reqwest, tokio-tungstenite (WebSockets)
- **Auth**: JWT, Argon2 password hashing

## 📦 Quick Start

### Prerequisites
- Docker & Docker Compose
- Git

### Local Development
1. Clone the repository:
   ```bash
   git clone https://github.com/shayneeo/fossvps_dashboard.git
   cd fossvps_dashboard
   ```

2. Create environment files:
   ```bash
   # Backend
   cp backend/.env.example backend/.env
   # Frontend
   cp frontend/.env.example frontend/.env.local
   ```

3. Start the stack:
   ```bash
   docker-compose up --build
   ```

4. Access the dashboard:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:3001
   - Login with: `admin` / `admin123` (CHANGE THIS!)

### Production Deployment

#### Using Dokploy (Recommended)
1. Push your code to GitHub
2. Configure Dokploy with:
   - GitHub repository link
   - Environment variables (see [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md))
   - SSL certificates via Let's Encrypt
3. Deploy with one click

#### Manual Docker Deployment
```bash
# Use production compose file
docker-compose -f docker-compose.prod.yml up -d
```

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for complete deployment guide.

## 🔐 Security

- **Authentication**: JWT-based with secure token storage
- **Password Hashing**: Argon2id for password security
- **Role-Based Access**: Admin and User roles
- **CORS Protection**: Configurable CORS policies
- **Database Security**: Parameterized queries, no SQL injection

⚠️ **Important**: Change default credentials immediately after first login!

## 📚 Documentation

- [Production Checklist](./PRODUCTION_CHECKLIST.md) - Pre-deployment security and configuration
- [Deployment Guide](./DEPLOYMENT.md) - Detailed deployment instructions
- [Backend API](./instructions/backend-api.md) - API documentation
- [Database Schema](./instructions/database-schema.md) - Database structure

## 🎯 Roadmap

- [ ] Rate limiting for API endpoints
- [ ] Token blacklist for proper logout
- [ ] Two-factor authentication (2FA)
- [ ] Audit logs for admin actions
- [ ] OpenAPI/Swagger documentation
- [ ] WebSocket authentication
- [ ] Email notifications
- [ ] Advanced VM metrics

## 🤝 Support
For technical assistance or reporting issues:
- Email: `support@fossvps.org`
- GitHub Issues: [Create an issue](https://github.com/shayneeo/fossvps_dashboard/issues)

## 📜 License
This project is licensed under the **GNU General Public License v3.0**. See the [LICENSE](./LICENSE) file for details.

---
Copyright © 2026 FOSSVPS. Produced with ❤️ by the FOSSVPS Engineering Team.
