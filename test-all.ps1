<#
.SYNOPSIS
    Complete test suite for Home Service Chatbot - FIXED
#>

# Configuration
$baseUrl = "http://localhost:3000"
$headers = @{
    "Content-Type" = "application/json"
}

Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "HOME SERVICE CHATBOT - COMPLETE TEST SUITE" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host ""

# Check if server is running
Write-Host "Checking if server is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/api/health" -Method GET -TimeoutSec 5
    Write-Host "Server is running" -ForegroundColor Green
} catch {
    Write-Host "Server is NOT running!" -ForegroundColor Red
    Write-Host "Please run: npm run dev" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Test 1: Health Check
Write-Host "TEST 1: Health Check" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/health" -Method GET -Headers $headers
    Write-Host "Status: $($response.status)" -ForegroundColor Green
    Write-Host "Environment: $($response.environment)" -ForegroundColor Green
    Write-Host "Version: $($response.version)" -ForegroundColor Green
    Write-Host "PASSED" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 2: Generate Examples
Write-Host "TEST 2: Generate Examples (Plumbing)" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Gray
try {
    $body = @{
        category = "plumbing"
        count = 5
        language = "en"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/examples/generate" -Method POST -Headers $headers -Body $body
    Write-Host "Generated: $($response.data.generated)" -ForegroundColor Green
    Write-Host "Added: $($response.data.added)" -ForegroundColor Green
    Write-Host "Failed: $($response.data.failed)" -ForegroundColor Green
    Write-Host "PASSED" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 3: Generate More Examples (HVAC)
Write-Host "TEST 3: Generate Examples (HVAC)" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Gray
try {
    $body = @{
        category = "hvac"
        count = 5
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/examples/generate" -Method POST -Headers $headers -Body $body
    Write-Host "Added: $($response.data.added) HVAC examples" -ForegroundColor Green
    Write-Host "PASSED" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 4: Check Statistics
Write-Host "TEST 4: Check Examples Statistics" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Gray
try {
    $response = Invoke-RestMethod -Uri "$baseUrl/api/examples/stats" -Method GET -Headers $headers
    Write-Host "Total Examples: $($response.data.total)" -ForegroundColor Green
    Write-Host "By Language:" -ForegroundColor Yellow
    $response.data.by_language.PSObject.Properties | ForEach-Object {
        Write-Host "  $($_.Name): $($_.Value)" -ForegroundColor White
    }
    Write-Host "PASSED" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 5: RAG Search (FIXED - No ampersand issues)
Write-Host "TEST 5: RAG Vector Search" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Gray
try {
    $searchUrl = "$baseUrl/api/examples/search" + "?query=leaking%20pipe" + "&threshold=0.75"
    $response = Invoke-RestMethod -Uri $searchUrl -Method GET -Headers $headers
    Write-Host "Query: 'leaking pipe'" -ForegroundColor Cyan
    Write-Host "Examples Found: $($response.data.examples_found)" -ForegroundColor Green
    if ($response.data.examples_found -gt 0) {
        Write-Host "Top Match Similarity: $([math]::Round($response.data.examples[0].similarity * 100, 1))%" -ForegroundColor White
    }
    Write-Host "PASSED" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 6: Chat - Simple Question
Write-Host "TEST 6: Chat - Simple Question" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Gray
try {
    $body = @{
        message = "How much does it cost to fix a leaking faucet?"
        language = "en"
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method POST -Headers $headers -Body $body
    Write-Host "Question: 'How much does it cost to fix a leaking faucet?'" -ForegroundColor Cyan
    $responseText = $response.data.response
    if ($responseText.Length -gt 100) {
        $responseText = $responseText.Substring(0, 100) + "..."
    }
    Write-Host "Response: $responseText" -ForegroundColor Green
    Write-Host "Confidence: $([math]::Round($response.data.confidence * 100, 1))%" -ForegroundColor Green
    Write-Host "Examples Used: $($response.data.examples_used)" -ForegroundColor Green
    $global:sessionId = $response.data.session_id
    Write-Host "PASSED" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 7: Chat - Follow-up Question
Write-Host "TEST 7: Chat - Follow-up Question" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Gray
try {
    $body = @{
        message = "Do you offer emergency service?"
        language = "en"
        session_id = $global:sessionId
    } | ConvertTo-Json

    $response = Invoke-RestMethod -Uri "$baseUrl/api/chat" -Method POST -Headers $headers -Body $body
    Write-Host "Question: 'Do you offer emergency service?'" -ForegroundColor Cyan
    Write-Host "Confidence: $([math]::Round($response.data.confidence * 100, 1))%" -ForegroundColor Green
    Write-Host "PASSED" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""

# Test 8: Chat History
Write-Host "TEST 8: Retrieve Chat History" -ForegroundColor Cyan
Write-Host "---------------------------------------------" -ForegroundColor Gray
try {
    $historyUrl = "$baseUrl/api/chat/$global:sessionId"
    $response = Invoke-RestMethod -Uri $historyUrl -Method GET -Headers $headers
    Write-Host "Messages in session: $($response.count)" -ForegroundColor Green
    Write-Host "PASSED" -ForegroundColor Green
} catch {
    Write-Host "FAILED: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Cyan
Write-Host "TEST SUITE COMPLETE" -ForegroundColor Cyan
Write-Host "===============================================" -ForegroundColor Cyan
