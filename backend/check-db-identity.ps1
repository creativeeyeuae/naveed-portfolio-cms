Write-Host "--- /services ---"
curl.exe -4 -sS --max-time 25 -w "`nHTTP:%{http_code}`n" "https://naveed-portfolio-cms-api-preview.creativeeyeuae.workers.dev/services"
Write-Host "--- /packages ---"
curl.exe -4 -sS --max-time 25 -w "`nHTTP:%{http_code}`n" "https://naveed-portfolio-cms-api-preview.creativeeyeuae.workers.dev/packages"
