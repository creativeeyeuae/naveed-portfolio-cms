$root = 'C:\Users\creat\Desktop\naveed-portfolio-cms\naveed-portfolio-cms\frontend'
$files = Get-ChildItem -Path $root -Recurse -Include *.ts,*.tsx,*.css
$changed = 0
foreach ($f in $files) {
  $text = [System.IO.File]::ReadAllText($f.FullName)
  $orig = $text
  $text = $text -creplace '703CF8','8B5CF6'
  $text = $text -creplace '6226FF','A855F7'
  $text = $text -creplace 'D7D4FF','E2D9F3'
  $text = $text -creplace 'FFC01D','8B5CF6'
  $text = $text -creplace 'FFD966','A855F7'
  $text = $text -creplace '112, 60, 248','139, 92, 246'
  $text = $text -creplace '112,60,248','139,92,246'
  if ($text -ne $orig) {
    [System.IO.File]::WriteAllText($f.FullName, $text)
    $changed++
    Write-Output "changed: $($f.FullName)"
  }
}
Write-Output "TOTAL FILES CHANGED: $changed"
