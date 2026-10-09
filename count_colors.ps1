cd 'C:\Users\creat\Desktop\naveed-portfolio-cms\naveed-portfolio-cms\frontend'
$patterns = @('703CF8','6226FF','D7D4FF','FFC01D','FFD966','112,60,248','8B5CF6','A855F7','E2D9F3')
foreach ($pat in $patterns) {
  $files = Get-ChildItem -Recurse -Include *.ts,*.tsx,*.css
  $total = 0
  foreach ($f in $files) {
    $text = [System.IO.File]::ReadAllText($f.FullName)
    $m = [regex]::Matches($text, [regex]::Escape($pat))
    $total += $m.Count
  }
  Write-Output "$pat : $total"
}
