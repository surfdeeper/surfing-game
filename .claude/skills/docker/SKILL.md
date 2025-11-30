# Docker Skill

Use this skill when working with Docker containers, images, builds, or docker-compose.

## Trigger Keywords

Auto-apply when user mentions:
- Docker, container, image
- docker-compose, docker compose
- Build failing, container crashed
- Visual tests in Docker

## Critical Mistake to Avoid

**NEVER wait indefinitely on background bash commands for Docker operations.**

### ❌ Wrong Approach
```bash
# Start docker-compose in background
docker-compose build update-snapshots  # ID: abc123
# Then repeatedly check BashOutput for abc123
BashOutput(bash_id="abc123")  # Shows "Pulling from playwright..."
BashOutput(bash_id="abc123")  # Still shows "Pulling from playwright..."
BashOutput(bash_id="abc123")  # Still shows "Pulling from playwright..."
# Container crashed 10 minutes ago but you're still waiting!
```

### ✅ Correct Approach
```bash
# Start docker-compose in background
docker-compose build update-snapshots  # ID: abc123

# IMMEDIATELY check actual Docker container status
docker ps -a  # Shows exit code if crashed
docker logs <container-id>  # Shows actual error

# THEN check bash output for context
BashOutput(bash_id="abc123")
```

## Essential Docker Commands

### Monitor Container Status

```bash
# List running containers only
docker ps

# List ALL containers (including stopped/crashed)
docker ps -a

# Check specific container logs
docker logs <container-id>

# Follow logs in real-time
docker logs -f <container-id>

# Check container exit code
docker ps -a  # STATUS column shows "Exited (134)" etc.
```

### Common Exit Codes

| Exit Code | Meaning | Common Causes |
|-----------|---------|---------------|
| 0 | Success | Container completed normally |
| 1 | General error | Application error, test failure |
| 127 | Command not found | Missing binary, typo in CMD |
| 134 | Segmentation fault | Node/C++ crash, memory corruption |
| 137 | SIGKILL (OOM) | Out of memory |
| 139 | Segfault | Native code crash |

### Docker Images

```bash
# List images
docker images

# List images for specific repo
docker images | grep playwright

# Remove image
docker rmi <image-id>

# Remove all unused images
docker image prune
```

### Docker Compose

```bash
# Build services
docker-compose build

# Build specific service
docker-compose build visual-tests

# Run service once and remove
docker-compose run --rm visual-tests

# View compose logs
docker-compose logs

# Stop all services
docker-compose down

# Remove volumes too
docker-compose down -v
```

## Debugging Build Failures

### Step-by-step diagnosis:

1. **Check container status**
   ```bash
   docker ps -a
   # Look for recent containers with "Exited" status
   ```

2. **Get container logs**
   ```bash
   docker logs <container-id>
   # Shows the full error output
   ```

3. **Check the exit code**
   - Exit 134 = Segfault (likely Node.js crash)
   - Exit 137 = OOM killed
   - Exit 127 = Command not found

4. **Inspect the image**
   ```bash
   docker images
   # Verify the image was built/pulled correctly
   ```

5. **Clean up and retry**
   ```bash
   docker-compose down
   docker system prune  # Remove dangling images/containers
   docker-compose build --no-cache
   ```

## Common Issues

### Node.js Crashes in Container (Exit 134)

**Symptom**: Container exits with code 134, logs show `Assertion failed` or segfault

**Cause**: Incompatibility between new Node.js and old Docker daemon

**Solution**: Use older Playwright image
```dockerfile
# Instead of:
FROM mcr.microsoft.com/playwright:v1.57.0-jammy  # Node 20

# Use:
FROM mcr.microsoft.com/playwright:v1.40.0-jammy  # Node 18
```

### Volume Mount "Device or resource busy"

**Symptom**: `rm: cannot remove 'path': Device or resource busy`

**Cause**: Trying to delete a directory that's a Docker volume mount point

**Solution**: Delete contents, not the directory
```bash
# Instead of:
rm -rf tests/visual/results

# Use:
rm -rf tests/visual/results/*
```

### Docker Compose v1 vs v2

**Symptom**: `docker-compose: command not found` on newer systems

**GitHub Actions**: Uses v2 (`docker compose` with space)
**Local (old Docker)**: Uses v1 (`docker-compose` hyphenated)

**Solution**: Check which is available
```bash
docker compose version   # v2
docker-compose version   # v1
```

## Project-Specific Setup

### Visual Regression Testing

This project uses Docker for consistent visual regression baselines:

```bash
# Build the Docker image
npm run test:visual:docker:build

# Run visual tests
npm run test:visual:docker

# Update baselines
npm run test:visual:docker:update
```

**Key files**:
- `Dockerfile.playwright` - Defines the test environment
- `docker-compose.yml` - Service configuration with volume mounts
- `package.json` - npm scripts for Docker commands

**Volume mounts**:
- `./stories:/app/stories` - Baseline screenshots persist to host
- `./tests/visual/results:/app/tests/visual/results` - Test output
- `./tests/visual/report:/app/tests/visual/report` - HTML report

## Reference

- [Docker CLI Reference](https://docs.docker.com/engine/reference/commandline/cli/)
- [Docker Compose Reference](https://docs.docker.com/compose/reference/)
- [Playwright Docker](https://playwright.dev/docs/docker)
