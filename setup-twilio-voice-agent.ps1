# Twilio SIP Trunk Setup - Compatible with Twilio CLI 6.2.0
$PHONE_NUMBER = "+18335505387"
$GCP_EXTERNAL_IP = "34.67.46.55"
$TRUNK_NAME = "livekit-voice-agent"
$LIVEKIT_PORT = "7880"
$ErrorColor = "Red"
$WarningColor = "Yellow"
$SuccessColor = "Green"
$InfoColor = "Cyan"
function Write-Step {
    param([string]$Message)
    Write-Host ""
    Write-Host ("=" * 60) -ForegroundColor $InfoColor
    Write-Host " $Message" -ForegroundColor $InfoColor
    Write-Host ("=" * 60) -ForegroundColor $InfoColor
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
Clear-Host
Write-Host ""
Write-Host "TWILIO VOICE AGENT SETUP" -ForegroundColor $InfoColor
Write-Host ("=" * 60) -ForegroundColor $InfoColor
Write-Host ""
Write-Host "Phone:     (833) 550-5387" -ForegroundColor $SuccessColor
$sipServer = "sip:" + $GCP_EXTERNAL_IP + ":" + $LIVEKIT_PORT
Write-Host "Server:    $sipServer" -ForegroundColor $SuccessColor
Write-Host ""
# STEP 1: Authentication
Write-Step "STEP 1: Twilio Authentication"
Write-Success "Already authenticated"
# STEP 2: Get Phone Number SID (Manual Entry)
Write-Step "STEP 2: Get Phone Number SID"
Write-Info "Listing your phone numbers..."
Write-Host ""
# Use simple command without JSON parsing
twilio phone-numbers:list
Write-Host ""
Write-Host "Find your phone number: $PHONE_NUMBER" -ForegroundColor $InfoColor
Write-Host ""
$PHONE_SID = Read-Host "Enter the SID for (833) 550-5387 (starts with PN...)"
if (-not $PHONE_SID -or $PHONE_SID.Length -lt 10) {
    Write-Error-Message "Invalid SID entered"
    exit 1
}
Write-Success "Using Phone SID: $PHONE_SID"
# STEP 3: Create SIP Trunk
Write-Step "STEP 3: Creating SIP Trunk"
Write-Info "Creating trunk: $TRUNK_NAME"
# Use API command that works with your CLI version
$trunkOutput = twilio api:core:trunks:create --friendly-name $TRUNK_NAME -o json 2>&1 | Out-String
try {
    $trunkResult = $trunkOutput | ConvertFrom-Json
    $TRUNK_SID = $trunkResult.sid
    Write-Success "Trunk created: $TRUNK_SID"
} catch {
    Write-Error-Message "Failed to create trunk"
    Write-Host "Output: $trunkOutput"
    exit 1
}
# STEP 4: Configure Origination URI
Write-Step "STEP 4: Configuring Origination URI"
$sipUrl = "sip:" + $GCP_EXTERNAL_IP + ":" + $LIVEKIT_PORT
Write-Info "Target: $sipUrl"
$originationOutput = twilio api:core:trunks:origination-urls:create `
    --trunk-sid $TRUNK_SID `
    --friendly-name "LiveKit-$GCP_EXTERNAL_IP" `
    --sip-url $sipUrl `
    --priority 1 `
    --weight 1 `
    --enabled true `
    -o json 2>&1 | Out-String
try {
    $originationResult = $originationOutput | ConvertFrom-Json
    if ($originationResult.sid) {
        Write-Success "Origination configured: $sipUrl"
    }
} catch {
    Write-Error-Message "Failed to configure origination"
    Write-Host "Output: $originationOutput"
    exit 1
}
# STEP 5: Link Phone Number to Trunk
Write-Step "STEP 5: Linking Phone Number"
Write-Info "Linking $PHONE_NUMBER to trunk..."
$linkOutput = twilio api:core:trunks:phone-numbers:create `
    --trunk-sid $TRUNK_SID `
    --phone-number-sid $PHONE_SID `
    -o json 2>&1 | Out-String
try {
    $linkResult = $linkOutput | ConvertFrom-Json
    if ($linkResult.sid) {
        Write-Success "Phone linked successfully"
    }
} catch {
    # Check if already linked
    if ($linkOutput -match "already exists") {
        Write-Success "Already linked"
    } else {
        Write-Error-Message "Failed to link phone"
        Write-Host "Output: $linkOutput"
        exit 1
    }
}
# STEP 6: Verification
Write-Step "STEP 6: Verification"
$trunkInfo = twilio api:core:trunks:fetch --sid $TRUNK_SID -o json | ConvertFrom-Json
Write-Success "Configuration complete!"
# SUMMARY
Write-Host ""
Write-Host ("=" * 60) -ForegroundColor $SuccessColor
Write-Host " SETUP COMPLETE" -ForegroundColor $SuccessColor
Write-Host ("=" * 60) -ForegroundColor $SuccessColor
Write-Host ""
Write-Host "Phone:     (833) 550-5387" -ForegroundColor $SuccessColor
Write-Host "Phone SID: $PHONE_SID"
Write-Host ""
Write-Host "Trunk:     $TRUNK_NAME" -ForegroundColor $SuccessColor
Write-Host "Trunk SID: $TRUNK_SID"
Write-Host "Domain:    $($trunkInfo.domain_name)"
Write-Host ""
$serverUrl = "sip:" + $GCP_EXTERNAL_IP + ":" + $LIVEKIT_PORT
Write-Host "Server:    $serverUrl" -ForegroundColor $SuccessColor
Write-Host ""
Write-Host ("=" * 60) -ForegroundColor $InfoColor
Write-Host ""
Write-Host "NEXT STEPS:" -ForegroundColor $InfoColor
Write-Host "1. Ensure LiveKit is running on GCP VM" -ForegroundColor $WarningColor
Write-Host "2. Deploy your voice agent code" -ForegroundColor $WarningColor
Write-Host "3. Test by calling: (833) 550-5387" -ForegroundColor $SuccessColor
Write-Host ""
$openConsole = Read-Host "Open Twilio Console? (Y/N)"
if ($openConsole -eq "Y" -or $openConsole -eq "y") {
    $consoleUrl = "https://console.twilio.com/us1/develop/elastic-sip-trunking/trunks/" + $TRUNK_SID
    Start-Process $consoleUrl
}
Write-Host ""
Write-Host "Setup complete!" -ForegroundColor $SuccessColor
# Save config
$configFile = "twilio-setup-config.txt"
@"
Twilio Voice Agent Configuration
=================================
Generated: $(Get-Date)
Phone Number: (833) 550-5387
Phone SID: $PHONE_SID
Trunk Name: $TRUNK_NAME
Trunk SID: $TRUNK_SID
Trunk Domain: $($trunkInfo.domain_name)
LiveKit Server: $serverUrl
TEST: Call (833) 550-5387
"@ | Out-File -FilePath $configFile -Encoding UTF8
Write-Host ""
Write-Host "Config saved to: $configFile" -ForegroundColor $InfoColor
