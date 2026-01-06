-- Create user_role enum
CREATE TYPE user_role AS ENUM ('admin', 'user');

-- Create users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create node_type enum
CREATE TYPE node_type AS ENUM ('proxmox', 'incus');

-- Create node_status enum
CREATE TYPE node_status AS ENUM ('online', 'offline', 'error');

-- Create nodes table
CREATE TABLE nodes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    node_type node_type NOT NULL,
    api_url TEXT NOT NULL,
    api_key TEXT NOT NULL,
    api_secret TEXT,
    status node_status NOT NULL DEFAULT 'offline',
    last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
