param(
    [ValidateSet("up", "rebuild", "down", "logs", "ps")]
    [string]$Action = "up"
)

$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$DockerConfig = Join-Path $Root ".docker-local"
$DockerConfigFile = Join-Path $DockerConfig "config.json"

if (-not (Test-Path $DockerConfig)) {
    New-Item -ItemType Directory -Path $DockerConfig | Out-Null
}

if (-not (Test-Path $DockerConfigFile)) {
    "{}" | Set-Content -Path $DockerConfigFile -Encoding ascii
}

$env:COMPOSE_PROJECT_NAME = "mykaizenfit-dev"
$env:DOCKER_CONFIG = $DockerConfig

switch ($Action) {
    "up" {
        docker compose -f "$Root\docker-compose.dev.yml" up -d
    }
    "rebuild" {
        docker compose -f "$Root\docker-compose.dev.yml" up -d --build
    }
    "down" {
        docker compose -f "$Root\docker-compose.dev.yml" down
    }
    "logs" {
        docker compose -f "$Root\docker-compose.dev.yml" logs -f --tail=120
    }
    "ps" {
        docker compose -f "$Root\docker-compose.dev.yml" ps
    }
}
