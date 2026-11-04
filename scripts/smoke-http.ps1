param([string]$BaseUrl = 'http://localhost/adminTemplate/public')
$ErrorActionPreference = 'Stop'
$BaseUrl = $BaseUrl.TrimEnd('/')
$login = Invoke-WebRequest -Uri "$BaseUrl/login" -SessionVariable nexoSession -UseBasicParsing
$token = [regex]::Match($login.Content, 'name="_token" value="([^"]+)"').Groups[1].Value
if (-not $token) { throw 'Login form is missing its CSRF token.' }
$overview = Invoke-WebRequest -Uri "$BaseUrl/demo" -Method Post -WebSession $nexoSession -Body @{ _token = $token } -UseBasicParsing
if ($overview.Content -notmatch 'Your business, in focus') { throw 'Demo login did not reach the overview.' }
Write-Output 'PASS: Login, CSRF validation, session, and dashboard'
foreach ($page in @('orders','customers','products','settings')) {
    $response = Invoke-WebRequest -Uri "$BaseUrl/$page" -WebSession $nexoSession -UseBasicParsing
    if ($response.StatusCode -ne 200) { throw "Failed page: $page" }
    Write-Output "PASS: $page HTTP 200"
}
$customers = Invoke-WebRequest -Uri "$BaseUrl/customers" -WebSession $nexoSession -UseBasicParsing
$snapshot = [System.Net.WebUtility]::HtmlDecode([regex]::Match($customers.Content, 'wire:snapshot="([^"]+)"').Groups[1].Value)
$configJson = [regex]::Match($customers.Content, 'window.livewireScriptConfig = (.*?);</script>').Groups[1].Value
$livewireConfig = $configJson | ConvertFrom-Json
if (-not $snapshot -or -not $livewireConfig.uri) { throw 'Livewire configuration is incomplete.' }
$body = @{ components = @(@{ snapshot = $snapshot; updates = @{ search = 'Olivia' }; calls = @() }); _token = $livewireConfig.csrf } | ConvertTo-Json -Depth 20 -Compress
$result = Invoke-WebRequest -Uri $livewireConfig.uri -Method Post -WebSession $nexoSession -ContentType 'application/json' -Headers @{ 'X-Livewire' = 'true'; 'X-CSRF-TOKEN' = $livewireConfig.csrf; 'Accept' = 'application/json' } -Body $body -UseBasicParsing
$update = $result.Content | ConvertFrom-Json
if ($update.components[0].effects.html -notmatch 'Olivia Rhye') { throw 'Livewire customer search failed.' }
Write-Output 'PASS: Livewire search over HTTP with authenticated session and CSRF'
$export = Invoke-WebRequest -Uri "$BaseUrl/exports/orders?period=30" -WebSession $nexoSession -UseBasicParsing
if ($export.Headers['Content-Type'] -notmatch 'text/csv') { throw 'Export is not CSV.' }
Write-Output 'PASS: Authenticated CSV export'
$assets = [regex]::Matches($overview.Content, '(?:src|href)="([^"]+/build/assets/[^"]+)"')
foreach ($asset in $assets) {
    $response = Invoke-WebRequest -Uri $asset.Groups[1].Value -UseBasicParsing
    if ($response.StatusCode -ne 200) { throw 'A compiled asset could not be loaded.' }
}
Write-Output 'PASS: Compiled CSS and JavaScript assets'
