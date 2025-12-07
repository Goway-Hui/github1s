<#
.SYNOPSIS
    Deploy GitHub1s to remote server.
    
.DESCRIPTION
    Packages the application, uploads it to the remote server, builds the Docker image, and starts the container.

.PARAMETER ServerIP
    The IP address of the remote server. Default is 1.94.250.84.

.PARAMETER Port
    The port to run the application on. Default is 8000.
#>

param (
    [string]$ServerIP = "1.94.250.84",
    [string]$Port = "4000",
    [string]$IdentityFile = "",
    [string]$NginxHttpPort = "8081",
    [string]$NginxHttpsPort = "8443"
)

$RemotePath = "/root/github1s"
$ArchiveName = "github1s-deploy.tar.gz"

# --- SSH/SCP Configuration ---
$SSHOptions = @("-o", "StrictHostKeyChecking=no", "-o", "UserKnownHostsFile=/dev/null")
if ($IdentityFile -and (Test-Path $IdentityFile)) {
    Write-Host "Using Identity File: $IdentityFile" -ForegroundColor Green
    $SSHOptions += ("-i", $IdentityFile)
} elseif (Test-Path "$HOME/.ssh/id_rsa") {
    Write-Host "Found default SSH key at $HOME/.ssh/id_rsa, using it." -ForegroundColor Green
    $SSHOptions += ("-i", "$HOME/.ssh/id_rsa")
} elseif (Test-Path "$HOME/.ssh/id_ed25519") {
    Write-Host "Found default SSH key at $HOME/.ssh/id_ed25519, using it." -ForegroundColor Green
    $SSHOptions += ("-i", "$HOME/.ssh/id_ed25519")
}


# --- SSL Certificate Handling ---
$CertDir = "certs"
if (-not (Test-Path $CertDir)) {
    New-Item -ItemType Directory -Force -Path $CertDir | Out-Null
}

# Define user's specific certificate names
$UserCert = "helloahui.site_chain.pem"
$UserKey = "helloahui.site_key.key"

if ((Test-Path $UserCert) -and (Test-Path $UserKey)) {
    Write-Host "Found custom SSL certificates: $UserCert, $UserKey" -ForegroundColor Green
    Copy-Item $UserCert -Destination "$CertDir/server.crt" -Force
    Copy-Item $UserKey -Destination "$CertDir/server.key" -Force
    Write-Host "Certificates copied to $CertDir/ for deployment." -ForegroundColor Green
} else {
    # Fallback: Try to find any .pem/.crt and .key pair
    $FoundCert = Get-ChildItem -Path . -Filter "*.pem" | Select-Object -First 1
    if (-not $FoundCert) { $FoundCert = Get-ChildItem -Path . -Filter "*.crt" | Select-Object -First 1 }
    $FoundKey = Get-ChildItem -Path . -Filter "*.key" | Select-Object -First 1

    if ($FoundCert -and $FoundKey) {
        Write-Host "Found SSL certificates: $($FoundCert.Name), $($FoundKey.Name)" -ForegroundColor Green
        Copy-Item $FoundCert.FullName -Destination "$CertDir/server.crt" -Force
        Copy-Item $FoundKey.FullName -Destination "$CertDir/server.key" -Force
        Write-Host "Certificates copied to $CertDir/ for deployment." -ForegroundColor Green
    } else {
        Write-Host "No custom SSL certificates found in root. Self-signed certificates will be generated on server." -ForegroundColor Yellow
    }
}
# -------------------------------

Write-Host "Starting deployment to $ServerIP..." -ForegroundColor Cyan

# 1. Package the application
Write-Host "Step 1: Packaging application..." -ForegroundColor Yellow
# Check if tar exists
if (-not (Get-Command "tar" -ErrorAction SilentlyContinue)) {
    Write-Error "Error: 'tar' command not found. Please install it or use a different method."
    exit 1
}

# Exclude dist and other unnecessary files, BUT include .git (needed for build versioning)
# We exclude node_modules to avoid cross-platform issues (Windows binaries on Linux)
tar --exclude="*.tar.gz" --exclude="node_modules" -czf $ArchiveName .

if (-not (Test-Path $ArchiveName)) {
    Write-Error "Error: Failed to create archive."
    exit 1
}
Write-Host "Archive created: $ArchiveName" -ForegroundColor Green

# 2. Upload to server
Write-Host "Step 2: Uploading to server (You may be asked for password)..." -ForegroundColor Yellow
Write-Host "Running: scp $SSHOptions $ArchiveName root@${ServerIP}:/root/$ArchiveName" -ForegroundColor DarkGray

# Use splatting or direct argument passing. PowerShell handles array expansion for external commands well usually,
# but sometimes needs explicit quoting.
scp @SSHOptions $ArchiveName "root@${ServerIP}:/root/$ArchiveName"

if ($LASTEXITCODE -ne 0) {
    Write-Error "Error: Upload failed. Try running with -Verbose to see more details, or check your SSH keys."
    # Keep archive for debugging if needed, or just warn
    # Remove-Item $ArchiveName 
    exit 1
}
Write-Host "Upload complete." -ForegroundColor Green

# 3. Remote Execution
Write-Host "Step 3: Building and running on remote server..." -ForegroundColor Yellow
$RemoteScript = @"
    echo 'Unpacking...'
    rm -rf $RemotePath
    mkdir -p $RemotePath
    tar -xzf /root/$ArchiveName -C $RemotePath --warning=no-unknown-keyword
    rm /root/$ArchiveName
    cd $RemotePath

    echo 'Checking for Docker...'
    if ! command -v docker &> /dev/null; then
        echo 'Error: Docker is not installed on the remote server.'
        exit 1
    fi

    echo 'Stopping existing container (if any)...'
    docker stop github1s-app 2>/dev/null || true
    docker rm github1s-app 2>/dev/null || true

    echo 'Generating SSL certificates...'
    chmod +x generate-ssl.sh
    ./generate-ssl.sh

    echo "Freeing up ports $NginxHttpPort and $NginxHttpsPort..."
    # 1. Stop system Nginx/Apache only if using standard ports
    if [ "$NginxHttpPort" = "80" ] || [ "$NginxHttpsPort" = "443" ]; then
        systemctl stop nginx 2>/dev/null || true
        systemctl stop apache2 2>/dev/null || true
        systemctl stop httpd 2>/dev/null || true
    fi
    
    # 2. Stop any Docker containers using the specific ports
    echo "Stopping conflicting Docker containers..."
    docker ps -q --filter "publish=$NginxHttpPort" | xargs -r docker stop 2>/dev/null || true
    docker ps -q --filter "publish=$NginxHttpPort" | xargs -r docker rm 2>/dev/null || true
    docker ps -q --filter "publish=$NginxHttpsPort" | xargs -r docker stop 2>/dev/null || true
    docker ps -q --filter "publish=$NginxHttpsPort" | xargs -r docker rm 2>/dev/null || true

    # 3. Kill any process listening on ports
    if command -v fuser &> /dev/null; then
        fuser -k $NginxHttpPort/tcp 2>/dev/null || true
        fuser -k $NginxHttpsPort/tcp 2>/dev/null || true
    fi
    
    # 4. Fallback: Use lsof if available
    if command -v lsof &> /dev/null; then
        lsof -t -i:$NginxHttpPort | xargs -r kill -9 2>/dev/null || true
        lsof -t -i:$NginxHttpsPort | xargs -r kill -9 2>/dev/null || true
    fi

    # 5. Fallback: Use netstat if available
    if command -v netstat &> /dev/null; then
         netstat -ltnp | grep -w ":$NginxHttpPort" | awk '{print $7}' | cut -d/ -f1 | xargs -r kill -9 2>/dev/null || true
         netstat -ltnp | grep -w ":$NginxHttpsPort" | awk '{print $7}' | cut -d/ -f1 | xargs -r kill -9 2>/dev/null || true
    fi

    echo 'Starting services with Docker Compose...'
    
    # Generate .env file
    echo "NGINX_HTTP_PORT=$NginxHttpPort" > .env
    echo "NGINX_HTTPS_PORT=$NginxHttpsPort" >> .env
    
    # Check if docker-compose is installed
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        echo 'Error: Docker Compose is not installed. Installing...'
        # Simple install attempt (might fail if no curl/permissions)
        curl -L "https://github.com/docker/compose/releases/download/v2.24.5/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        chmod +x /usr/local/bin/docker-compose
    fi

    # Use 'docker compose' (v2) or 'docker-compose' (v1)
    if docker compose version &> /dev/null; then
        docker compose up -d --build --remove-orphans
    else
        docker-compose up -d --build --remove-orphans
    fi

    echo '----------------------------------------'
    echo 'Deployment Success!'
    echo "Access your app at: https://${ServerIP}:${NginxHttpsPort} (HTTPS) or http://${ServerIP}:${NginxHttpPort} (HTTP)"
    echo '----------------------------------------'
"@

# Execute remote script via SSH
# We use Base64 encoding to avoid line-ending issues (CRLF vs LF) when sending commands from Windows to Linux
$RemoteScriptUnix = $RemoteScript -replace "`r`n", "`n"
$EncodedScript = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($RemoteScriptUnix))

ssh @SSHOptions root@$ServerIP "echo '$EncodedScript' | base64 -d | bash"

# Cleanup local archive
Remove-Item $ArchiveName
Write-Host "Local cleanup done." -ForegroundColor Cyan
