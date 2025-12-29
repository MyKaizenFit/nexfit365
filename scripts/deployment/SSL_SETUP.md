# 🔒 Configuración de SSL/HTTPS End-to-End

Esta guía explica cómo configurar SSL/HTTPS completo (end-to-end) para nexfit365.dpdns.org.

## 📋 Situación Actual

**Antes:**
- Cloudflare maneja SSL (Flexible SSL)
- Usuario → [HTTPS] → Cloudflare → [HTTP] → Servidor
- ❌ No hay SSL entre Cloudflare y el servidor

**Después:**
- SSL end-to-end completo
- Usuario → [HTTPS] → Cloudflare → [HTTPS] → Servidor
- ✅ SSL completo en toda la cadena

## 🚀 Instalación Automática

### Paso 1: Ejecutar el script de instalación

```bash
cd /srv/mykaizenfit/pro
sudo ./scripts/deployment/setup-ssl.sh
```

El script:
1. ✅ Instala certbot y plugin de nginx
2. ✅ Obtiene certificados SSL de Let's Encrypt
3. ✅ Configura nginx para HTTPS
4. ✅ Configura redirección HTTP → HTTPS
5. ✅ Configura renovación automática

### Paso 2: Verificar que funciona

```bash
# Verificar certificados
sudo certbot certificates

# Probar renovación (sin aplicar cambios)
sudo certbot renew --dry-run

# Verificar que nginx funciona
sudo nginx -t
sudo systemctl status nginx
```

### Paso 3: Probar en el navegador

- https://nexfit365.dpdns.org
- https://www.nexfit365.dpdns.org
- https://api.nexfit365.dpdns.org

Deberías ver el candado verde 🔒 en el navegador.

## ⚙️ Configuración de Cloudflare

**IMPORTANTE:** Después de configurar SSL en el servidor, cambia Cloudflare:

1. Ve a [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Selecciona tu dominio `nexfit365.dpdns.org`
3. Ve a **SSL/TLS** → **Overview**
4. Cambia de **"Flexible"** a **"Full (strict)"**

**Modos de SSL en Cloudflare:**
- ❌ **Off**: Sin SSL
- ❌ **Flexible**: SSL solo entre usuario y Cloudflare (actual)
- ⚠️ **Full**: SSL completo pero acepta certificados auto-firmados
- ✅ **Full (strict)**: SSL completo con certificados válidos (recomendado)

## 🔄 Renovación Automática

Los certificados Let's Encrypt expiran cada 90 días. Certbot los renueva automáticamente.

### Verificar renovación automática

```bash
# Ver estado del timer
sudo systemctl status certbot.timer

# Ver cuándo se renovará
sudo systemctl list-timers | grep certbot

# Probar renovación manual (sin aplicar)
sudo certbot renew --dry-run
```

### Renovación manual (si es necesario)

```bash
sudo certbot renew
sudo systemctl reload nginx
```

## 🛠️ Solución de Problemas

### Error: "Failed to obtain certificate"

**Causa:** Los dominios no apuntan correctamente al servidor o el puerto 80 está bloqueado.

**Solución:**
1. Verifica que los DNS apuntan correctamente:
   ```bash
   dig nexfit365.dpdns.org
   dig api.nexfit365.dpdns.org
   ```

2. Verifica que el puerto 80 está abierto:
   ```bash
   sudo netstat -tlnp | grep :80
   sudo ufw status
   ```

3. Si usas Cloudflare, asegúrate de que está en modo "DNS only" o "Full" (no "Full strict") durante la obtención del certificado.

### Error: "nginx configuration test failed"

**Causa:** Error en la configuración de nginx.

**Solución:**
```bash
# Ver el error específico
sudo nginx -t

# Ver logs de nginx
sudo tail -f /var/log/nginx/error.log
```

### Certificado expirado

**Solución:**
```bash
# Renovar manualmente
sudo certbot renew

# Recargar nginx
sudo systemctl reload nginx
```

### Verificar certificado

```bash
# Ver información del certificado
sudo certbot certificates

# Ver fecha de expiración
sudo openssl x509 -in /etc/letsencrypt/live/nexfit365.dpdns.org/cert.pem -noout -dates
```

## 📝 Archivos Importantes

- **Certificados SSL:**
  - `/etc/letsencrypt/live/nexfit365.dpdns.org/`
  - `/etc/letsencrypt/live/api.nexfit365.dpdns.org/`

- **Configuración de nginx:**
  - `/etc/nginx/sites-enabled/nexfit365.conf` (modificado por certbot)

- **Logs:**
  - `/var/log/letsencrypt/letsencrypt.log`
  - `/var/log/nginx/error.log`

## 🔐 Seguridad Adicional

### Headers de Seguridad

La configuración incluye headers de seguridad:
- `Strict-Transport-Security`: Fuerza HTTPS
- `X-Frame-Options`: Previene clickjacking
- `X-Content-Type-Options`: Previene MIME sniffing
- `X-XSS-Protection`: Protección XSS

### Configuración SSL Moderna

- ✅ Solo TLS 1.2 y 1.3
- ✅ Cifrados modernos y seguros
- ✅ OCSP Stapling habilitado
- ✅ Perfect Forward Secrecy

## 📚 Referencias

- [Let's Encrypt Documentation](https://letsencrypt.org/docs/)
- [Certbot Documentation](https://eff-certbot.readthedocs.io/)
- [Nginx SSL Configuration](https://nginx.org/en/docs/http/configuring_https_servers.html)
- [Cloudflare SSL Modes](https://developers.cloudflare.com/ssl/origin-configuration/ssl-modes/)

## ✅ Checklist Post-Instalación

- [ ] Certificados SSL obtenidos exitosamente
- [ ] HTTPS funciona en todos los dominios
- [ ] Redirección HTTP → HTTPS funciona
- [ ] Cloudflare cambiado a "Full (strict)"
- [ ] Renovación automática configurada
- [ ] Headers de seguridad funcionando
- [ ] Verificado en navegador (candado verde)

