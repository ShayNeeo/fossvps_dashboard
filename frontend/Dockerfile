# Production Dockerfile - pulls pre-built image from GHCR
# For building from source, use Dockerfile.build

FROM ghcr.io/shayneeo/fossvps-dashboard-frontend:latest

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
