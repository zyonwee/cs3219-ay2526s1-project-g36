# PeerPrep Backend

This is the backend infrastructure for the PeerPrep platform - a collaborative peer learning system that connects students for technical interview preparation. The backend consists of multiple microservices orchestrated using Docker Compose.

## Architecture Overview

The backend is built using a microservices architecture with the following services:

### 🎯 **Matching Service** (Port 3001)

A NestJS-based service that handles user matching logic for pairing students based on their preferences, skill levels, and availability. Features include:

-   Real-time matching via WebSocket
-   Queue management for waiting users
-   Matchmaking algorithms

### 🤝 **Collaboration Service** (Port 3002)

A NestJS-based real-time collaboration service that enables:

-   Shared code editing sessions using Yjs and LevelDB
-   WebSocket-based real-time communication
-   Chat functionality between matched users
-   Session persistence and recovery

### 📊 **API Service** (Separate)

The main REST API service built with NestJS, providing:

-   User authentication and profile management
-   Question bank management
-   User data and progress tracking
-   Integration with Supabase and MongoDB

## Technology Stack

-   **Framework**: NestJS (Node.js)
-   **Real-time Communication**: Socket.IO
-   **Database**: LevelDB (for collaboration state), MongoDB, PostgreSQL (via Supabase)
-   **Authentication**: JWT with Supabase
-   **Containerization**: Docker & Docker Compose
-   **Language**: TypeScript

## Prerequisites

Before running the backend services, ensure you have the following installed:

### For Windows Users:

-   **Docker Desktop** - [Download here](https://www.docker.com/products/docker-desktop/)
    -   Make sure Docker Desktop is running before executing any Docker commands
    -   WSL 2 backend is recommended for better performance

### For All Users:

-   **Node.js** (v16 or higher) - [Download here](https://nodejs.org/)
-   **npm** or **yarn** package manager
-   **Git** for version control

## Getting Started

Follow these steps to set up and run the backend services:

### Step 1: Install Dependencies

Navigate to each service directory and install dependencies:

```bash
# Install dependencies for matching service
cd matching-service
npm install
cd ..

# Install dependencies for collab service
cd collab-service
npm install
cd ..
```

### Step 2: Configure Environment Variables

Each service requires its own `.env` file for configuration.

#### Matching Service Configuration

Create a `.env` file in `matching-service/` directory:

```bash
cd matching-service
```

Create `.env` with the following content:

```env
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
```

#### Collaboration Service Configuration

Create a `.env` file in `collab-service/` directory:

```bash
cd ../collab-service
```

Create `.env` with the following content (you can also copy from `.env.example`):

```env
NODE_ENV=development
PORT=3000
CORS_ORIGINS=http://localhost:3000,http://localhost:3001,http://localhost:3002
COLLAB_SERVICE_PATH=/data/leveldb
SUPABASE_JWT_SECRET=your-supabase-jwt-secret-here
```

> **Note**: Replace `your-supabase-jwt-secret-here` with your actual Supabase JWT secret. You can find this in your Supabase project settings under API > JWT Secret.

### Step 3: Build Docker Images

Navigate back to the backend root directory and build the Docker images:

```bash
cd ..  # Make sure you're in the backend/ directory
docker compose build
```

This command will:

-   Build Docker images for both matching and collaboration services
-   Install all necessary dependencies inside the containers
-   Prepare the services for deployment

> **Troubleshooting**: If you encounter build errors, ensure:
>
> -   Docker Desktop is running
> -   You have a stable internet connection (for downloading dependencies)
> -   The `.env` files are properly created in each service directory

### Step 4: Start the Services

Start all services using Docker Compose:

```bash
docker compose up
```

Or run in detached mode (background):

```bash
docker compose up -d
```

This will:

-   Start the matching service on `http://localhost:3001`
-   Start the collaboration service on `http://localhost:3002`
-   Create a shared Docker network (`peerprep-net`) for inter-service communication
-   Mount the LevelDB volume for persistent collaboration data

### Step 5: Verify Services are Running

Check the status of running containers:

```bash
docker compose ps
```

You should see both `matching-service` and `collab-service` with status "Up".

Check the logs to ensure services started correctly:

```bash
# View logs for all services
docker compose logs

# View logs for a specific service
docker compose logs matching
docker compose logs collab

# Follow logs in real-time
docker compose logs -f
```

## Service Endpoints

Once running, the services are available at:

| Service                    | URL                          | Description                                    |
| -------------------------- | ---------------------------- | ---------------------------------------------- |
| Matching Service           | http://localhost:3001        | WebSocket endpoint for user matching           |
| Collaboration Service      | http://localhost:3002        | WebSocket endpoint for real-time collaboration |
| Collaboration Health Check | http://localhost:3002/health | Health status endpoint                         |

## Common Docker Commands

### Starting Services

```bash
# Start all services
docker compose up

# Start in detached mode (background)
docker compose up -d

# Start specific service
docker compose up matching
```

### Stopping Services

```bash
# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# Stop but keep containers
docker compose stop
```

### Rebuilding After Changes

```bash
# Rebuild specific service
docker compose build matching
docker compose build collab

# Rebuild and restart
docker compose up --build
```

### Viewing Logs

```bash
# View all logs
docker compose logs

# View logs for specific service
docker compose logs matching

# Follow logs in real-time
docker compose logs -f

# View last 100 lines
docker compose logs --tail=100
```

### Container Management

```bash
# List running containers
docker compose ps

# Execute command in running container
docker compose exec matching sh
docker compose exec collab sh

# Restart a specific service
docker compose restart matching
```

## Development Workflow

### Running Services Locally (Without Docker)

For faster development iteration, you can run services locally:

#### Matching Service

```bash
cd matching-service
npm run start:dev  # Runs on port 3000
```

#### Collaboration Service

```bash
cd collab-service
npm run start:dev  # Runs on port 3000
```

> **Note**: When running locally, services use port 3000 by default. The Docker Compose setup maps them to 3001 and 3002 respectively.

### Testing the Services

Each service includes a test client for development:

#### Testing Collaboration Service

1. Start the service (via Docker or locally)
2. Open `collab-service/test-client/index.html` in your browser
3. Use the test interface to connect and test WebSocket functionality

#### Testing Matching Service

1. Start the service (via Docker or locally)
2. Open `matching-service/test-client/index.html` in your browser
3. Test the matching queue and pairing functionality

## Project Structure

```
backend/
├── docker-compose.yml          # Docker orchestration configuration
├── package.json                # Root-level dependencies
├── README.md                   # This file
│
├── matching-service/           # Matching microservice
│   ├── Dockerfile
│   ├── src/
│   │   ├── matching/           # Matching logic and gateway
│   │   └── main.ts
│   ├── test-client/            # Test interface
│   └── .env                    # Environment variables (create this)
│
├── collab-service/             # Collaboration microservice
│   ├── Dockerfile
│   ├── src/
│   │   ├── collab/             # Collaboration gateway and service
│   │   ├── auth/               # JWT authentication
│   │   └── main.ts
│   ├── test-client/            # Test interface
│   └── .env                    # Environment variables (create this)
│
├── collab-level-db/            # LevelDB persistent storage
│
└── api/                        # Main REST API service
    ├── prisma/                 # Database schemas
    ├── src/
    │   ├── auth/
    │   ├── profile/
    │   ├── questions/
    │   └── main.ts
    └── docs/                   # API documentation
```

## Troubleshooting

### Docker Desktop Not Running

**Error**: `Cannot connect to the Docker daemon`  
**Solution**: Start Docker Desktop and wait for it to fully initialize.

### Port Already in Use

**Error**: `port is already allocated`  
**Solution**:

-   Stop any services using ports 3001 or 3002
-   Or modify the port mappings in `docker-compose.yml`

### Build Failures

**Error**: Build fails during `npm install`  
**Solution**:

-   Delete `node_modules` in service directories
-   Run `docker compose build --no-cache`
-   Check your internet connection

### Environment Variables Not Loading

**Error**: Service fails to start with config errors  
**Solution**:

-   Verify `.env` files exist in both service directories
-   Check that `.env` files are not empty
-   Ensure no extra spaces around `=` in `.env` files

### Services Can't Communicate

**Error**: Services can't connect to each other  
**Solution**:

-   Ensure all services are on the same Docker network (`peerprep-net`)
-   Check `docker compose ps` to verify all services are running
-   Review CORS_ORIGINS configuration in `.env` files

### LevelDB Lock Issues

**Error**: `IO error: lock file already held`  
**Solution**:

-   Stop all containers: `docker compose down`
-   Remove the lock file: `rm collab-level-db/LOCK`
-   Restart: `docker compose up`

## Additional Resources

-   **NestJS Documentation**: https://docs.nestjs.com
-   **Socket.IO Documentation**: https://socket.io/docs/
-   **Docker Documentation**: https://docs.docker.com
-   **Docker Compose Documentation**: https://docs.docker.com/compose/

## Contributing

When contributing to the backend:

1. Create a feature branch
2. Make your changes
3. Test locally using both Docker and local development mode
4. Ensure all services build successfully
5. Update this README if you add new services or configuration
6. Submit a pull request

## License

This project is part of the CS3219 course project.
