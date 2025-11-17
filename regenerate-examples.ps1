Write-Host "Regenerating all examples with embeddings..." -ForegroundColor Cyan

$categories = @("plumbing", "hvac", "electrical", "roofing")

foreach ($category in $categories) {
    Write-Host "`nGenerating $category examples..." -ForegroundColor Yellow
    
    try {
        $body = @{
            category = $category
            count = 10
        } | ConvertTo-Json
        
        $response = Invoke-RestMethod -Uri "http://localhost:3000/api/examples/generate" -Method POST -Headers @{"Content-Type"="application/json"} -Body $body
        
        Write-Host "  Generated: $($response.data.generated)" -ForegroundColor Green
        Write-Host "  Added: $($response.data.added)" -ForegroundColor Green
        Write-Host "  Failed: $($response.data.failed)" -ForegroundColor $(if ($response.data.failed -eq 0) { "Green" } else { "Red" })
    } catch {
        Write-Host "  ERROR: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`nChecking statistics..." -ForegroundColor Yellow
$stats = Invoke-RestMethod -Uri "http://localhost:3000/api/examples/stats"
Write-Host "Total Examples: $($stats.data.total)" -ForegroundColor Cyan

Write-Host "`nTesting vector search..." -ForegroundColor Yellow
$search = Invoke-RestMethod -Uri "http://localhost:3000/api/examples/search?query=leak"
Write-Host "Examples Found: $($search.data.examples_found)" -ForegroundColor Cyan

if ($search.data.examples_found -gt 0) {
    Write-Host "`nSUCCESS! Vector search is working!" -ForegroundColor Green
    Write-Host "Top match similarity: $([math]::Round($search.data.examples[0].similarity * 100, 1))%" -ForegroundColor Green
} else {
    Write-Host "`nWARNING: Vector search returned 0 results" -ForegroundColor Yellow
    Write-Host "Check if pgvector extension is enabled in Supabase" -ForegroundColor Yellow
}
