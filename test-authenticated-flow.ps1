$ErrorActionPreference = "Stop"
$base = "http://localhost:3000"

# 1) Login as student
$loginBody = @{ email = "ahmet.cetin@std.mersin.edu.tr"; password = "student123" } | ConvertTo-Json
$session = New-Object Microsoft.PowerShell.Commands.WebRequestSession
try {
  $login = Invoke-WebRequest -Uri "$base/api/auth/internal-login" -Method POST `
    -ContentType "application/json" -Body $loginBody -WebSession $session -UseBasicParsing -TimeoutSec 20
  Write-Output "LOGIN STATUS: $($login.StatusCode)"
} catch {
  Write-Output "LOGIN ERR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Output "LOGIN RESP: $($reader.ReadToEnd())"
  }
  exit 1
}

# 2) Submit authenticated petition
$body = @{
  phone = "05051234567"
  category = "TALEP"
  targetUnitCode = "OGRENCI_ISLERI"
  subject = "Test basvuru konusu - oturumlu form kontrolu"
  content = "Bu bir uctan uca test basvurusudur. Girdi olarak birkaç satir icerik yaziyorum ki 20 karakter sinirini asayim."
  privacyNoticeVersion = "2026-08-01"
  privacyNoticeAcknowledged = $true
} | ConvertTo-Json

try {
  $resp = Invoke-WebRequest -Uri "$base/api/petitions/authenticated" -Method POST `
    -ContentType "application/json" -Body $body -WebSession $session -UseBasicParsing -TimeoutSec 20
  Write-Output "PETITION STATUS: $($resp.StatusCode)"
  Write-Output "PETITION RESP: $($resp.Content)"
} catch {
  Write-Output "PETITION ERR: $($_.Exception.Message)"
  if ($_.Exception.Response) {
    $stream = $_.Exception.Response.GetResponseStream()
    $reader = New-Object System.IO.StreamReader($stream)
    Write-Output "PETITION RESP: $($reader.ReadToEnd())"
  }
}
