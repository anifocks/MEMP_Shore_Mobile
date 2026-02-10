param(
  [Parameter(Mandatory=$true)][string]$BaseUrl,
  [Parameter(Mandatory=$true)][string]$ExcelTemplatePath,
  [Parameter(Mandatory=$true)][string]$OutputZipPath
)

$templatePath = Join-Path $PSScriptRoot 'manifest.template.xml'
$manifestPath = Join-Path $PSScriptRoot 'manifest.xml'

$template = Get-Content $templatePath -Raw
$template = $template -replace '{{BASE_URL}}', $BaseUrl
Set-Content $manifestPath $template

Compress-Archive -Path $manifestPath, $ExcelTemplatePath -DestinationPath $OutputZipPath -Force
Write-Host "Created $OutputZipPath with manifest.xml and Excel template."
