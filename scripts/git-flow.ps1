# Git Flow Scripts para Sara Aitor Project
# Uso: .\scripts\git-flow.ps1 [comando]

param(
    [Parameter(Mandatory=$true)]
    [ValidateSet("dev-to-pre", "pre-to-pro", "status", "setup")]
    [string]$Command
)

function Show-Status {
    Write-Host "=== Estado de las Ramas ===" -ForegroundColor Cyan
    git branch -a
    Write-Host "`n=== Rama Actual ===" -ForegroundColor Yellow
    git branch --show-current
    Write-Host "`n=== Últimos Commits ===" -ForegroundColor Green
    git log --oneline -5
}

function Setup-GitFlow {
    Write-Host "=== Configurando Git Flow ===" -ForegroundColor Cyan
    
    # Crear ramas si no existen
    $branches = @("dev", "pre", "pro")
    foreach ($branch in $branches) {
        if (!(git branch --list $branch)) {
            git checkout -b $branch
            Write-Host "Rama $branch creada" -ForegroundColor Green
        } else {
            Write-Host "Rama $branch ya existe" -ForegroundColor Yellow
        }
    }
    
    # Volver a dev
    git checkout dev
    Write-Host "`nConfiguración completada. Rama actual: dev" -ForegroundColor Green
}

function Merge-DevToPre {
    Write-Host "=== Moviendo cambios de DEV a PRE ===" -ForegroundColor Cyan
    
    # Verificar que estamos en dev
    $currentBranch = git branch --show-current
    if ($currentBranch -ne "dev") {
        Write-Host "Cambiando a rama dev..." -ForegroundColor Yellow
        git checkout dev
    }
    
    # Hacer pull de dev
    Write-Host "Actualizando rama dev..." -ForegroundColor Yellow
    git pull origin dev
    
    # Cambiar a pre
    Write-Host "Cambiando a rama pre..." -ForegroundColor Yellow
    git checkout pre
    
    # Hacer pull de pre
    Write-Host "Actualizando rama pre..." -ForegroundColor Yellow
    git pull origin pre
    
    # Hacer merge
    Write-Host "Haciendo merge de dev a pre..." -ForegroundColor Yellow
    git merge dev --no-ff -m "Merge dev to pre: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    
    # Push a pre
    Write-Host "Subiendo cambios a pre..." -ForegroundColor Yellow
    git push origin pre
    
    Write-Host "`n✅ Cambios movidos de DEV a PRE exitosamente" -ForegroundColor Green
    Write-Host "Rama actual: pre" -ForegroundColor Cyan
}

function Merge-PreToPro {
    Write-Host "=== Moviendo cambios de PRE a PRO ===" -ForegroundColor Cyan
    
    # Verificar que estamos en pre
    $currentBranch = git branch --show-current
    if ($currentBranch -ne "pre") {
        Write-Host "Cambiando a rama pre..." -ForegroundColor Yellow
        git checkout pre
    }
    
    # Hacer pull de pre
    Write-Host "Actualizando rama pre..." -ForegroundColor Yellow
    git pull origin pre
    
    # Cambiar a pro
    Write-Host "Cambiando a rama pro..." -ForegroundColor Yellow
    git checkout pro
    
    # Hacer pull de pro
    Write-Host "Actualizando rama pro..." -ForegroundColor Yellow
    git pull origin pro
    
    # Hacer merge
    Write-Host "Haciendo merge de pre a pro..." -ForegroundColor Yellow
    git merge pre --no-ff -m "Merge pre to pro: $(Get-Date -Format 'yyyy-MM-dd HH:mm')"
    
    # Push a pro
    Write-Host "Subiendo cambios a pro..." -ForegroundColor Yellow
    git push origin pro
    
    Write-Host "`n✅ Cambios movidos de PRE a PRO exitosamente" -ForegroundColor Green
    Write-Host "🚀 Deploy a producción iniciado" -ForegroundColor Red
    Write-Host "Rama actual: pro" -ForegroundColor Cyan
}

# Ejecutar comando
switch ($Command) {
    "setup" { Setup-GitFlow }
    "status" { Show-Status }
    "dev-to-pre" { Merge-DevToPre }
    "pre-to-pro" { Merge-PreToPro }
}

Write-Host "`n=== Comandos disponibles ===" -ForegroundColor Magenta
Write-Host ".\scripts\git-flow.ps1 setup      - Configurar ramas" -ForegroundColor White
Write-Host ".\scripts\git-flow.ps1 status     - Ver estado" -ForegroundColor White
Write-Host ".\scripts\git-flow.ps1 dev-to-pre - Mover dev → pre" -ForegroundColor White
Write-Host ".\scripts\git-flow.ps1 pre-to-pro - Mover pre → pro" -ForegroundColor White
