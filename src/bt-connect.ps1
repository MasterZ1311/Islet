# Names of connected Bluetooth devices, checked every few seconds. A JSON array is written
# only when the set changes, so Islet can pop up "connected" and "disconnected".
$ErrorActionPreference = "SilentlyContinue"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$key = '{83DA6326-97A6-4088-9453-A1923F573B29} 15'
$parent = [int]$args[0]
$last = $null
while ($true) {
  if ($parent -and -not (Get-Process -Id $parent)) { exit }
  $names = @(Get-PnpDevice -Class Bluetooth | Where-Object { $_.InstanceId -match '^(BTHENUM|BTHLE)\DEV_' } | Where-Object {
    (Get-PnpDeviceProperty -InstanceId $_.InstanceId -KeyName $key).Data -eq $true
  } | ForEach-Object { $_.FriendlyName } | Sort-Object -Unique)
  $json = ConvertTo-Json -InputObject $names -Compress
  if ($json -ne $last) { [Console]::Out.WriteLine($json); [Console]::Out.Flush(); $last = $json }
  Start-Sleep -Seconds 5
}
