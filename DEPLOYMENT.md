# FOSSVPS Dashboard Deployment

This project is a monorepo containing a Next.js frontend and a Rust/Axum backend.

## Deployment with Dokploy

1. **Connect Repository**: Point Dokploy to your GitHub/GitLab repository.
2. **Setup Frontend**:
   - Application Type: Docker
   - Build Context: `frontend/`
   - Dockerfile: `frontend/Dockerfile`
   - Environment Variables:
     - `NEXT_PUBLIC_API_URL`: Your backend URL (e.g., https://api.fossvps.org)
     - `NEXT_PUBLIC_WS_URL`: Your backend WebSocket URL (e.g., wss://api.fossvps.org)
3. **Setup Backend**:
   - Application Type: Docker
   - Build Context: `backend/`
   - Dockerfile: `backend/Dockerfile`
   - Environment Variables:
     - `DATABASE_URL`: Your PostgreSQL connection string.
     - `JWT_SECRET`: A long random string.
     - `NODE_ENV`: `production`

## Local Development (Docker)

To run the entire stack locally:
```bash
docker-compose up --build
```

## Database Migrations
The backend uses SQLx. In production, ensure migrations are run before starting the app. The backend binary handles migrations automatically if configured in `main.rs`.
