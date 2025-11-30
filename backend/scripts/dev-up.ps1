<# 
  Dev Up — Gym Backend (Django + DRF)
  Uso:
    powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\dev-up.ps1 [-RecreateVenv] [-OpenReport] [-StartServer] [-SkipMigrate]
#>

[CmdletBinding()]
param(
  [switch]$RecreateVenv,
  [switch]$OpenReport,
  [switch]$StartServer,
  [switch]$SkipMigrate
)

$ErrorActionPreference = 'Stop'

function Write-Section($title) {
  Write-Host ""
  Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
  Write-Host " $title" -ForegroundColor Cyan
  Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
}

function Write-Ok($msg)     { Write-Host "  [OK]  $msg" -ForegroundColor Green }
function Write-Warn($msg)   { Write-Host "  [WARN] $msg" -ForegroundColor Yellow }
function Write-ErrLine($msg){ Write-Host "  [ERR] $msg" -ForegroundColor Red }

function Ensure-Command($name) {
  if (-not (Get-Command $name -ErrorAction SilentlyContinue)) {
    throw "No se encontró el comando requerido: $name"
  }
}

function Mask-DatabaseUrl($url) {
  if (-not $url) { return "" }
  # Escapar $ para que PowerShell no lo trate como variable/scope
  $pattern = '://([^:]+):([^@]+)@'
  $replacement = "://`$1:***@"
  return ($url -replace $pattern, $replacement)
}

# 1) Localiza manage.py (en raiz o ./backend)
Write-Section "1) Prechequeos del sistema"
$MANAGE_DIR = $null
if (Test-Path ".\manage.py") {
  $MANAGE_DIR = (Get-Location).Path
} elseif (Test-Path ".\backend\manage.py") {
  $MANAGE_DIR = (Resolve-Path ".\backend").Path
} else {
  throw "No se encontró manage.py en la carpeta actual ni en ./backend"
}

Ensure-Command python
Ensure-Command pip
Write-Ok ("Python: " + ((python --version) -join ' '))
Write-Ok ("Pip: " + ((pip --version) -join ' '))

# 2) Carga .env
Write-Section "2) Cargar variables de entorno (.env)"
$dotenvPath = Join-Path $MANAGE_DIR ".env"
if (Test-Path $dotenvPath) {
  Get-Content $dotenvPath | Where-Object {$_ -and $_ -notmatch '^\s*#'} | ForEach-Object {
    $pair = $_ -split '=',2
    if ($pair.Length -eq 2) {
      $k = $pair[0].Trim()
      $v = $pair[1].Trim().Trim("'").Trim('"')
      if ($k) { Set-Item -Path "env:$k" -Value $v -ErrorAction SilentlyContinue }
    }
  }
  Write-Ok "Cargado .env desde $dotenvPath"
} else {
  Write-Warn "No hay .env en $MANAGE_DIR; uso variables de entorno del sistema."
}

# Fallback dev: SQLite si no hay DATABASE_URL
if (-not $env:DATABASE_URL) {
  $sqlitePath = Join-Path $MANAGE_DIR "db.sqlite3"
  $env:DATABASE_URL = "sqlite:///$sqlitePath"
  Write-Warn "DATABASE_URL no definido; usando SQLite local: $sqlitePath"
}
Write-Ok ("DATABASE_URL = " + (Mask-DatabaseUrl $env:DATABASE_URL))

# 3) venv
Write-Section "3) Entorno virtual"
$VENV_DIR = ".venv"
$VENV_PATH = Join-Path $MANAGE_DIR $VENV_DIR

if ($RecreateVenv -and (Test-Path $VENV_PATH)) {
  Write-Warn "Borrando venv existente (--RecreateVenv)"
  Remove-Item -Recurse -Force $VENV_PATH
}
if (-not (Test-Path $VENV_PATH)) {
  Push-Location $MANAGE_DIR
  python -m venv $VENV_DIR
  Pop-Location
  Write-Ok "Venv creado en $VENV_PATH"
} else {
  Write-Ok "Venv detectado: $VENV_PATH"
}

# Activar venv (PowerShell)
$activate = Join-Path $VENV_PATH "Scripts\Activate.ps1"
. $activate
Write-Ok "Venv activado"

# 4) Dependencias
Write-Section "4) Dependencias"
Push-Location $MANAGE_DIR
python -m pip install --upgrade pip wheel setuptools | Out-Null

if (Test-Path "requirements.txt") {
  pip install -r requirements.txt
} else {
  Write-Warn "No hay requirements.txt — instalando base"
  pip install Django "psycopg[binary]" djangorestframework djangorestframework-simplejwt dj-database-url drf-spectacular django-cors-headers Pillow whitenoise django-filter
}

if (Test-Path "requirements-dev.txt") {
  pip install -r requirements-dev.txt
} else {
  pip install pytest pytest-django pytest-cov pytest-html pytest-xdist model-bakery freezegun
}
Pop-Location
Write-Ok "Dependencias listas"

# 5) Chequeos Django
Write-Section "5) Chequeos Django"
Push-Location $MANAGE_DIR
Write-Host "Running: python manage.py check"
python manage.py check

New-Item -ItemType Directory -Force -Path "reports" | Out-Null
Write-Host "Running: python manage.py spectacular --file reports\openapi.yaml"
try {
  python manage.py spectacular --file "reports\openapi.yaml" | Out-Null
  Write-Ok "OpenAPI generado en reports\openapi.yaml"
} catch {
  Write-Warn "No se pudo generar OpenAPI (drf-spectacular no configurado o error menor)."
}

Write-Host "Running: python manage.py showmigrations --plan"
python manage.py showmigrations --plan
Pop-Location

# 6) Migraciones y static
Write-Section "6) Migraciones y static"
if (-not $SkipMigrate) {
  Push-Location $MANAGE_DIR
  python manage.py migrate
  python manage.py collectstatic --noinput
  Pop-Location
  Write-Ok "Migraciones aplicadas y estáticos recolectados"
} else {
  Write-Warn "Saltando migraciones (--SkipMigrate)"
}

# 7) Tests + reportes
Write-Section "7) Test suite + reportes"
Push-Location $MANAGE_DIR
New-Item -ItemType Directory -Force -Path "reports" | Out-Null

$pytestCmd = @(
  "pytest",
  "-q",
  "--maxfail=1",
  "--disable-warnings",
  "--cov=.",
  "--cov-report=xml:reports\coverage.xml",
  "--cov-report=term-missing",
  "--junitxml=reports\junit.xml",
  "--html=reports\pytest.html",
  "--self-contained-html",
  "--log-cli-level=INFO",
  "--log-file=reports\pytest.log",
  "--log-file-level=INFO"
)
try {
  & $pytestCmd
  $pytestExit = $LASTEXITCODE
} catch {
  $pytestExit = 1
}
Pop-Location

# 8) Resumen
Write-Section "8) Resumen"
$covPath = Join-Path $MANAGE_DIR "reports\coverage.xml"
$junitPath = Join-Path $MANAGE_DIR "reports\junit.xml"
$pytestHtml = Join-Path $MANAGE_DIR "reports\pytest.html"
$pytestLog  = Join-Path $MANAGE_DIR "reports\pytest.log"
$openapiYaml= Join-Path $MANAGE_DIR "reports\openapi.yaml"

if (Test-Path $covPath) {
  try {
    [xml]$covXml = Get-Content $covPath
    $lineRate = [double]$covXml.coverage.'line-rate'
    $pct = [math]::Round($lineRate * 100, 2)
    $color = if ($pct -ge 85) { 'Green' } elseif ($pct -ge 70) { 'Yellow' } else { 'Red' }
    Write-Host ("  Cobertura: {0}%%" -f $pct) -ForegroundColor $color
  } catch {
    Write-Warn "No pude leer coverage.xml"
  }
} else {
  Write-Warn "No se encontró reports\coverage.xml"
}

if (Test-Path $junitPath)   { Write-Ok "JUnit: $junitPath" }     else { Write-Warn "JUnit no generado" }
if (Test-Path $pytestHtml)  { Write-Ok "Reporte HTML: $pytestHtml" } else { Write-Warn "pytest.html no generado" }
if (Test-Path $pytestLog)   { Write-Ok "Log tests: $pytestLog" }
if (Test-Path $openapiYaml) { Write-Ok "OpenAPI: $openapiYaml" }

if ($pytestExit -ne 0) {
  Write-ErrLine "Tests con fallos (exit $pytestExit). Revisa reports\pytest.html y reports\pytest.log"
} else {
  Write-Ok "Test suite OK"
}

# 9) Runserver opcional
Write-Section "9) Arrancar servidor (opcional)"
if ($StartServer) {
  Push-Location $MANAGE_DIR
  Write-Host "Iniciando: python manage.py runserver 0.0.0.0:8000" -ForegroundColor Magenta
  Write-Host "Swagger:  http://127.0.0.1:8000/api/docs/" -ForegroundColor DarkCyan
  Write-Host "Schema:   http://127.0.0.1:8000/api/schema/" -ForegroundColor DarkCyan
  python manage.py runserver 0.0.0.0:8000
  Pop-Location
} else {
  Write-Host "Puedes iniciar el server con:  python manage.py runserver" -ForegroundColor DarkCyan
}
