# Solución al Error de Permisos de Docker

## Error
```
permission denied while trying to connect to the Docker daemon socket
```

## Causa
El usuario `iago` no está en el grupo `docker`, por lo que no puede acceder al socket de Docker (`/var/run/docker.sock`).

## Soluciones

### Opción 1: Agregar usuario al grupo docker (Recomendado)

```bash
# Agregar usuario al grupo docker
sudo usermod -aG docker iago

# Aplicar los cambios (cerrar sesión y volver a entrar, o usar newgrp)
newgrp docker

# Verificar que funciona
docker ps
```

**Nota**: Después de agregar al grupo, necesitas cerrar sesión y volver a entrar, o usar `newgrp docker` para aplicar los cambios.

### Opción 2: Usar sudo (Temporal)

Si no quieres cambiar los grupos, puedes usar `sudo` para los comandos de Docker:

```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
```

## Verificar Permisos

```bash
# Ver el socket de Docker
ls -la /var/run/docker.sock

# Ver grupos del usuario
groups

# Verificar si el usuario está en el grupo docker
groups | grep docker
```

## Comandos Correctos para DEV

### Con sudo (si no estás en el grupo docker):
```bash
cd /srv/mykaizenfit/pro
sudo COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
```

### Sin sudo (si estás en el grupo docker):
```bash
cd /srv/mykaizenfit/pro
COMPOSE_PROJECT_NAME=nexfit-pro docker compose -f docker-compose.prod.yml up -d
```

