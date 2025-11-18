Write-Output " Auditoría rápida de Shai-Hulud en package-lock.json y node_modules"
Write-Output "---------------------------------------------------------"

# 1. Revisar dependencias que no vengan del registro oficial
Write-Output " Revisando URLs en package-lock.json..."
Select-String -Path "package-lock.json" -Pattern '"resolved":' | Where-Object {$_ -notmatch "registry.npmjs.org"}

# 2. Buscar scripts de instalación sospechosos
Write-Output " Buscando postinstall/preinstall en lockfile..."
Select-String -Path "package-lock.json" -Pattern '"postinstall":'
Select-String -Path "package-lock.json" -Pattern '"preinstall":'
Select-String -Path "package-lock.json" -Pattern '"install":'

# 3. Buscar palabras clave maliciosas (bundle.js, curl, wget, powershell, etc.)
Write-Output " Buscando patrones maliciosos..."
$patterns = @("bundle.js","curl","wget","powershell","Invoke-WebRequest","shai","hulud")
foreach ($p in $patterns) {
    Select-String -Path "package-lock.json" -Pattern $p -SimpleMatch
}

# 4. Revisar node_modules directamente (si existe)
if (Test-Path "node_modules") {
    Write-Output " Revisando node_modules por bundle.js o scripts sospechosos..."
    Get-ChildItem -Path "node_modules" -Recurse -Filter "bundle.js" -ErrorAction SilentlyContinue

    foreach ($p in $patterns) {
        Write-Output "Buscando $p en node_modules..."
        Get-ChildItem -Path "node_modules" -Recurse -File -ErrorAction SilentlyContinue | ForEach-Object {
            try {
                Select-String -Path $_.FullName -Pattern $p -SimpleMatch -ErrorAction SilentlyContinue
            } catch {}
        } | Select-Object -First 10
    }
} else {
    Write-Output " No existe node_modules, saltando revisión de directorios."
}

Write-Output " Auditoría finalizada"
