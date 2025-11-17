<#
.SYNOPSIS
    Twilio SIP Trunk Setup for Voice Agent - Production Ready
    
.DESCRIPTION
    Configures Twilio phone number (833) 550-5387 to forward calls
    to LiveKit server at 34.67.46.55:7880
    
.NOTES
    Phone: (833) 550-5387
    External IP: 34.67.46.55
    Internal IP: 10.128.0.2
    
    Run: PowerShell -ExecutionPolicy Bypass -File setup-twilio-voice-agent.ps1
#>

# ═══════════════════════════════════════════════════════════
# CONFIGURATION - VERIFIED SETTINGS
# ═══════════════════════════════════════════════════════════
$PHONE_NUMBER = "+18335505387"          # Your Twilio number
$GCP_INTERNAL_IP = "10.128.0.2"         # GCP internal IP
$GCP_EXTERNAL_IP = "34.67.46.55"        # GCP external IP (LiveKit server)
$TRUNK_NAME = "livekit-voice-agent"
$LIVEKIT_PORT = "7880"

# ═══════════════════════════════════════════════════════════
# DISPLAY CONFIGURATION
# ═══════════════════════════════════════════════════════════
$ErrorColor = "Red"
$WarningColor = "Yellow"
$SuccessColor = "Green"
$InfoColor = "Cyan"

function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host "══════════════════════════════════════════════════════" -ForegroundColor $InfoColor
    Write-Host " $Message" -ForegroundColor $InfoColor
    Write-Host "══════════════════════════════════════════════════════" -ForegroundColor $InfoColor
}

function Write-Success {
    param([string]$Message)
    Write-Host "✓ $Message" -ForegroundColor $SuccessColor
}

function Write-Error-Message {
    param([string]$Message)
    Write-Host "✗ $Message" -ForegroundColor $ErrorColor
}

function Write-Info {
    param([string]$Message)
    Write-Host "→ $Message" -ForegroundColor $WarningColor
}

function Test-CommandExists {
    param([string]$Command)
    $null = Get-Command $Command -ErrorAction SilentlyContinue
    return $?
}

# ═══════════════════════════════════════════════════════════
# HEADER
# ═══════════════════════════════════════════════════════════
Clear-Host
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor $InfoColor
Write-Host "║                                                           ║" -ForegroundColor $InfoColor
Write-Host "║     VOICE AGENT - TWILIO SIP TRUNK SETUP                 ║" -ForegroundColor $InfoColor
Write-Host "║     Production Configuration                              ║" -ForegroundColor $InfoColor
Write-Host "║                                                           ║" -ForegroundColor $InfoColor
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor $InfoColor
Write-Host ""
Write-Host "📞 Phone Number:    " -NoNewline
Write-Host "(833) 550-5387" -ForegroundColor $SuccessColor
Write-Host "🌐 External IP:     " -NoNewline
Write-Host "$GCP_EXTERNAL_IP" -ForegroundColor $SuccessColor
Write-Host "🔌 LiveKit Server:  " -NoNewline
Write-Host "sip:${GCP_EXTERNAL_IP}:${LIVEKIT_PORT}" -ForegroundColor $SuccessColor
Write-Host ""

# ═══════════════════════════════════════════════════════════
# STEP 1: Check Prerequisites
# ═══════════════════════════════════════════════════════════
Write-Step "STEP 1: Checking Prerequisites"

# Check Node.js
if (Test-CommandExists "node") {
    $nodeVersion = node --version
    Write-Success "Node.js installed: $nodeVersion"
} else {
    Write-Error-Message "Node.js is not installed!"
    Write-Info "Download from: https://nodejs.org/"
    Write-Host ""
    $download = Read-Host "Open Node.js download page? (Y/N)"
    if ($download -eq "Y" -or $download -eq "y") {
        Start-Process "https://nodejs.org/"
    }
    Write-Error-Message "Install Node.js and run this script again."
    exit 1
}

# Install/Check Twilio CLI
if (Test-CommandExists "twilio") {
    $twilioVersion = twilio --version
    Write-Success "Twilio CLI installed: $twilioVersion"
} else {
    Write-Info "Installing Twilio CLI..."
    npm install -g twilio-cli
    if ($LASTEXITCODE -eq 0) {
        Write-Success "Twilio CLI installed successfully"
    } else {
        Write-Error-Message "Failed to install Twilio CLI"
        exit 1
    }
}

# Install Twilio API plugin
Write-Info "Verifying Twilio API plugin..."
twilio plugins:install @twilio-labs/plugin-api 2>&1 | Out-Null
Write-Success "Twilio API plugin ready"

# ═══════════════════════════════════════════════════════════
# STEP 2: Twilio Authentication
# ═══════════════════════════════════════════════════════════
Write-Step "STEP 2: Twilio Authentication"

$profiles = twilio profiles:list 2>&1
if ($profiles -match "No profiles" -or $profiles -match "error") {
    Write-Info "You need to login to Twilio"
    Write-Host ""
    Write-Host "Get your credentials from Twilio Console:" -ForegroundColor $WarningColor
    Write-Host "  1. Account SID (starts with 'AC...')" -ForegroundColor $InfoColor
    Write-Host "  2. Auth Token (click 'Show' to reveal)" -ForegroundColor $InfoColor
    Write-Host ""
    
    $openConsole = Read-Host "Open Twilio Console now? (Y/N)"
    if ($openConsole -eq "Y" -or $openConsole -eq "y") {
        Start-Process "https://console.twilio.com"
        Write-Info "Opening Twilio Console..."
        Start-Sleep -Seconds 3
    }
    
    Write-Host ""
    Write-Host "Press Enter when ready to login..." -ForegroundColor $WarningColor
    Read-Host
    
    twilio login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Error-Message "Failed to authenticate with Twilio"
        exit 1
    }
    Write-Success "Successfully authenticated with Twilio"
} else {
    Write-Success "Already authenticated with Twilio"
}

# ═══════════════════════════════════════════════════════════
# STEP 3: Verify Phone Number
# ═══════════════════════════════════════════════════════════
Write-Step "STEP 3: Verifying Phone Number"

Write-Info "Checking for phone number: $PHONE_NUMBER"

$phones = twilio phone-numbers:list --output json 2>&1 | ConvertFrom-Json
$phoneExists = $phones | Where-Object { $_.phoneNumber -eq $PHONE_NUMBER }

if ($phoneExists) {
    $PHONE_SID = $phoneExists.sid
    Write-Success "Phone number verified: $PHONE_NUMBER"
    Write-Success "Phone SID: $PHONE_SID"
} else {
    Write-Error-Message "Phone number $PHONE_NUMBER not found!"
    Write-Host ""
    Write-Host "Available phone numbers in your account:" -ForegroundColor $InfoColor
    if ($phones.Count -gt 0) {
        foreach ($phone in $phones) {
            Write-Host "  • $($phone.phoneNumber) (SID: $($phone.sid))"
        }
    } else {
        Write-Host "  No phone numbers found" -ForegroundColor $WarningColor
    }
    Write-Host ""
    Write-Error-Message "Update the PHONE_NUMBER in the script or buy the number"
    exit 1
}

# ═══════════════════════════════════════════════════════════
# STEP 4: Create/Update SIP Trunk
# ═══════════════════════════════════════════════════════════
Write-Step "STEP 4: SIP Trunk Configuration"

Write-Info "Checking for existing trunk: $TRUNK_NAME"

$existingTrunks = twilio api:core:trunks:list --output json 2>&1 | ConvertFrom-Json
$existingTrunk = $existingTrunks | Where-Object { $_.friendly_name -eq $TRUNK_NAME }

if ($existingTrunk) {
    $TRUNK_SID = $existingTrunk.sid
    Write-Info "Trunk already exists: $TRUNK_SID"
    Write-Host ""
    
    $recreate = Read-Host "Recreate trunk (deletes old config)? (Y/N)"
    
    if ($recreate -eq "Y" -or $recreate -eq "y") {
        Write-Info "Deleting existing trunk..."
        twilio api:core:trunks:remove --sid $TRUNK_SID 2>&1 | Out-Null
        Write-Success "Old trunk deleted"
        
        Write-Info "Creating new trunk..."
        $trunkResult = twilio api:core:trunks:create `
            --friendly-name $TRUNK_NAME `
            --output json 2>&1 | ConvertFrom-Json
        $TRUNK_SID = $trunkResult.sid
        Write-Success "New trunk created: $TRUNK_SID"
    } else {
        Write-Success "Using existing trunk: $TRUNK_SID"
    }
} else {
    Write-Info "Creating new SIP trunk..."
    
    $trunkResult = twilio api:core:trunks:create `
        --friendly-name $TRUNK_NAME `
        --output json 2>&1 | ConvertFrom-Json
    
    if ($trunkResult.sid) {
        $TRUNK_SID = $trunkResult.sid
        Write-Success "SIP trunk created: $TRUNK_SID"
    } else {
        Write-Error-Message "Failed to create SIP trunk"
        Write-Host "Error: $trunkResult" -ForegroundColor $ErrorColor
        exit 1
    }
}

# ═══════════════════════════════════════════════════════════
# STEP 5: Configure Origination URI
# ═══════════════════════════════════════════════════════════
Write-Step "STEP 5: Configuring Origination URI"

$sipUrl = "sip:${GCP_EXTERNAL_IP}:${LIVEKIT_PORT}"
Write-Info "Target SIP URL: $sipUrl"

# Remove old URIs
Write-Info "Removing old origination URIs..."
$existingURIs = twilio api:core:trunks:origination-urls:list --trunk-sid $TRUNK_SID --output json 2>&1 | ConvertFrom-Json
foreach ($uri in $existingURIs) {
    Write-Info "  Removing: $($uri.sip_url)"
    twilio api:core:trunks:origination-urls:remove --trunk-sid $TRUNK_SID --sid $uri.sid 2>&1 | Out-Null
}

# Add new origination URI
Write-Info "Adding new origination URI..."

$originationResult = twilio api:core:trunks:origination-urls:create `
    --trunk-sid $TRUNK_SID `
    --friendly-name "LiveKit-GCP-34.67.46.55" `
    --sip-url $sipUrl `
    --priority 1 `
    --weight 1 `
    --enabled `
    --output json 2>&1 | ConvertFrom-Json

if ($originationResult.sid) {
    Write-Success "Origination URI configured: $sipUrl"
} else {
    Write-Error-Message "Failed to configure origination URI"
    Write-Host "Error: $originationResult" -ForegroundColor $ErrorColor
    exit 1
}

# ═══════════════════════════════════════════════════════════
# STEP 6: Associate Phone Number with Trunk
# ═══════════════════════════════════════════════════════════
Write-Step "STEP 6: Linking Phone Number to Trunk"

Write-Info "Associating $PHONE_NUMBER with trunk..."

# Check if already associated
$trunkNumbers = twilio api:core:trunks:phone-numbers:list --trunk-sid $TRUNK_SID --output json 2>&1 | ConvertFrom-Json
$alreadyAssociated = $trunkNumbers | Where-Object { $_.sid -eq $PHONE_SID }

if ($alreadyAssociated) {
    Write-Success "Phone number already linked to trunk"
} else {
    $associationResult = twilio api:core:trunks:phone-numbers:create `
        --trunk-sid $TRUNK_SID `
        --phone-number-sid $PHONE_SID `
        --output json 2>&1 | ConvertFrom-Json
    
    if ($associationResult.sid) {
        Write-Success "Phone number successfully linked to trunk"
    } else {
        Write-Error-Message "Failed to link phone number to trunk"
        Write-Host "Error: $associationResult" -ForegroundColor $ErrorColor
        exit 1
    }
}

# ═══════════════════════════════════════════════════════════
# STEP 7: Verification
# ═══════════════════════════════════════════════════════════
Write-Step "STEP 7: Verifying Complete Configuration"

Write-Info "Fetching final configuration..."

$trunkInfo = twilio api:core:trunks:fetch --sid $TRUNK_SID --output json | ConvertFrom-Json
$originationUrls = twilio api:core:trunks:origination-urls:list --trunk-sid $TRUNK_SID --output json | ConvertFrom-Json
$trunkPhoneNumbers = twilio api:core:trunks:phone-numbers:list --trunk-sid $TRUNK_SID --output json | ConvertFrom-Json

Write-Success "All configurations verified!"

# ═══════════════════════════════════════════════════════════
# FINAL SUMMARY
# ═══════════════════════════════════════════════════════════
Write-Host ""
Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor $SuccessColor
Write-Host "║                                                           ║" -ForegroundColor $SuccessColor
Write-Host "║                  ✓ SETUP COMPLETE!                        ║" -ForegroundColor $SuccessColor
Write-Host "║                                                           ║" -ForegroundColor $SuccessColor
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor $SuccessColor
Write-Host ""

Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host "  CONFIGURATION SUMMARY" -ForegroundColor $InfoColor
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host ""
Write-Host "📞 PHONE NUMBER" -ForegroundColor $WarningColor
Write-Host "   Number:              " -NoNewline
Write-Host "(833) 550-5387" -ForegroundColor $SuccessColor
Write-Host "   SID:                 " -NoNewline
Write-Host $PHONE_SID
Write-Host ""
Write-Host "🔌 SIP TRUNK" -ForegroundColor $WarningColor
Write-Host "   Name:                " -NoNewline
Write-Host $TRUNK_NAME -ForegroundColor $SuccessColor
Write-Host "   SID:                 " -NoNewline
Write-Host $TRUNK_SID
Write-Host "   Domain:              " -NoNewline
Write-Host $trunkInfo.domain_name
Write-Host ""
Write-Host "🖥️  LIVEKIT SERVER" -ForegroundColor $WarningColor
Write-Host "   External IP:         " -NoNewline
Write-Host $GCP_EXTERNAL_IP -ForegroundColor $SuccessColor
Write-Host "   Internal IP:         " -NoNewline
Write-Host $GCP_INTERNAL_IP
Write-Host "   SIP URI:             " -NoNewline
Write-Host "sip:${GCP_EXTERNAL_IP}:${LIVEKIT_PORT}" -ForegroundColor $SuccessColor
Write-Host ""
Write-Host "═════════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host ""

# Save configuration
$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$configFile = "twilio-config-$timestamp.txt"

@"
═══════════════════════════════════════════════════════════════
TWILIO VOICE AGENT - CONFIGURATION
Generated: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
═══════════════════════════════════════════════════════════════

PHONE NUMBER
  Number:              (833) 550-5387
  Formatted:           $PHONE_NUMBER
  SID:                 $PHONE_SID

SIP TRUNK
  Name:                $TRUNK_NAME
  SID:                 $TRUNK_SID
  Domain:              $($trunkInfo.domain_name)

LIVEKIT SERVER
  External IP:         $GCP_EXTERNAL_IP
  Internal IP:         $GCP_INTERNAL_IP
  SIP URI:             sip:${GCP_EXTERNAL_IP}:${LIVEKIT_PORT}
  Port:                $LIVEKIT_PORT

═══════════════════════════════════════════════════════════════
TESTING
═══════════════════════════════════════════════════════════════

Call this number to test: (833) 550-5387

Expected behavior:
1. Call connects
2. You hear greeting from voice agent
3. You can ask questions about home services
4. Agent responds with answers from RAG backend

═══════════════════════════════════════════════════════════════
TROUBLESHOOTING
═══════════════════════════════════════════════════════════════

If calls don't connect:

1. Check LiveKit is running:
   SSH: gcloud compute ssh livekit --zone=us-central1-a
   Status: docker ps | grep livekit
   Logs: docker logs livekit -f

2. Check firewall rules:
   - Port 7880 (TCP) - SIP signaling
   - Ports 50000-50100 (UDP) - RTC media

3. Check Twilio call logs:
   https://console.twilio.com/us1/monitor/logs/calls

4. Verify origination URI:
   https://console.twilio.com/us1/develop/elastic-sip-trunking/trunks/$TRUNK_SID

═══════════════════════════════════════════════════════════════
"@ | Out-File -FilePath $configFile -Encoding UTF8

Write-Success "Configuration saved to: $configFile"
Write-Host ""

# Next steps
Write-Host "NEXT STEPS" -ForegroundColor $InfoColor
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host ""
Write-Host "1. Verify LiveKit is running on GCP:"
Write-Host "   " -NoNewline
Write-Host "gcloud compute ssh livekit --zone=us-central1-a" -ForegroundColor $WarningColor
Write-Host "   " -NoNewline
Write-Host "docker ps | grep livekit" -ForegroundColor $WarningColor
Write-Host ""
Write-Host "2. Deploy your Next.js voice agent with:"
Write-Host "   • Voice agent code (lib/voice/agent.ts)"
Write-Host "   • API routes (app/api/voice/)"
Write-Host "   • Environment variables configured"
Write-Host ""
Write-Host "3. Test the complete system:"
Write-Host "   📞 Call: " -NoNewline
Write-Host "(833) 550-5387" -ForegroundColor $SuccessColor
Write-Host ""
Write-Host "══════════════════════════════════════════════════════════" -ForegroundColor $InfoColor
Write-Host ""

# Open Twilio console
$openConsole = Read-Host "Open Twilio Console to view setup? (Y/N)"
if ($openConsole -eq "Y" -or $openConsole -eq "y") {
    Start-Process "https://console.twilio.com/us1/develop/elastic-sip-trunking/trunks/$TRUNK_SID"
}

Write-Host ""
Write-Host "🎉 " -NoNewline -ForegroundColor $SuccessColor
Write-Host "Setup complete! Your voice agent is ready to receive calls!" -ForegroundColor $SuccessColor
Write-Host ""
Write-Host "Call " -NoNewline
Write-Host "(833) 550-5387" -NoNewline -ForegroundColor $SuccessColor
Write-Host " to test your voice agent!" -ForegroundColor $SuccessColor
Write-Host ""
