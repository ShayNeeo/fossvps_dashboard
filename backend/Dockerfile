FROM rust:1.75-bookworm as builder

WORKDIR /app
COPY . .

# Build for release
RUN cargo build --release

# Final runner stage
FROM debian:bookworm-slim

WORKDIR /app

# Install SSL certs for reqwest and other network operations
RUN apt-get update && apt-get install -y ca-certificates && rm -rf /var/lib/apt/lists/*

COPY --from=builder /app/target/release/backend /usr/local/bin/backend

EXPOSE 3001

CMD ["backend"]
