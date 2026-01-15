## Running the Project with Docker

This project provides a ready-to-use Docker setup for local development and production. The application is built with Node.js (version `22.13.1` as specified in the Dockerfile) and exposes port `10000` by default.

### Requirements
- Docker (latest version recommended)
- Docker Compose

### Environment Variables
- The application supports environment variables via a `.env` file. Uncomment the `env_file: ./.env` line in `compose.yaml` to enable automatic loading of environment variables.
- Ensure your `.env` file is present at the project root and contains all required configuration values for your environment.

### Build and Run Instructions
1. **Build and start the application:**
   ```bash
   docker compose up --build
   ```
   This will build the Docker image using the provided `Dockerfile` and start the service defined in `compose.yaml`.

2. **Access the application:**
   - The main service (`ts-app`) is exposed on port `3000`.
   - Visit `http://localhost:10000` to interact with the API.

### Special Configuration
- The Dockerfile uses multi-stage builds to optimize image size and security:
  - Only production dependencies are included in the final image.
  - The application runs as a non-root user (`appuser`).
- Uploaded files are persisted in the `/uploads` directory and are included in the container.
- If you need to add external services (e.g., MongoDB), refer to the commented sections in `compose.yaml` and adjust as needed.

### Ports
- **ts-app:** `10000:10000` (default NestJS port)

---

*For further customization, review the `Dockerfile` and `compose.yaml` for additional options and service definitions.*
