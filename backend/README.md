## Running the Project with Docker

This project provides a multi-stage Docker setup optimized for Node.js (v22.14.0) and pnpm (v10.4.1). The recommended way to build and run the application is via Docker Compose.

### Project-Specific Docker Requirements
- **Node.js version:** 22.14.0 (as set in the Dockerfile)
- **pnpm version:** 10.4.1 (installed and enabled via corepack)
- **Build system:** TypeScript (project is built during the Docker build process)

### Environment Variables
- The application expects environment variables to be provided via a `.env` file at the project root. Uncomment the `env_file: ./.env` line in `docker-compose.yaml` to enable this.
- Ensure your `.env` file contains all necessary configuration for your application (e.g., database URLs, secrets, SMTP settings, etc.).

### Build and Run Instructions
1. **(Optional) Prepare your `.env` file:**
   - Copy or create a `.env` file in the project root with all required variables.
2. **Build and start the application:**
   ```sh
   docker compose up --build
   ```
   This will build the Docker image using the provided Dockerfile and start the `typescript-app` service.

### Ports
- **Application:** Exposes port `3000` (mapped to `localhost:3000` by default)

### Special Configuration
- **Static Assets:** The `uploads/` directory is included in the production image. If your application relies on uploaded files, ensure this directory is present and populated as needed.
- **User Permissions:** The container runs as a non-root user (`appuser`) for improved security.
- **Dependencies:** All dependencies are installed via pnpm, and the build process is optimized for caching.
- **Additional Services:** If your application requires external services (e.g., MongoDB, Redis), uncomment and configure the relevant sections in `docker-compose.yaml`.

### Example: Enabling the .env File
Uncomment the following line in your `docker-compose.yaml` if you have a `.env` file:
```yaml
    env_file: ./.env
```

---

For further customization (e.g., adding databases or other services), refer to the commented sections in `docker-compose.yaml`. Ensure all required environment variables are set for your environment.