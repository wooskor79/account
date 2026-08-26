# Deploy project skills to global Antigravity config (~/.gemini/config/skills)
$globalSkillsDir = Join-Path $env:USERPROFILE ".gemini\config\skills"
$sourceSkillsDir = Join-Path $PSScriptRoot ".agents\skills"

if (!(Test-Path $globalSkillsDir)) {
    New-Item -ItemType Directory -Path $globalSkillsDir -Force | Out-Null
}

if (Test-Path $sourceSkillsDir) {
    Copy-Item -Path "$sourceSkillsDir\*" -Destination $globalSkillsDir -Recurse -Force
    Write-Host "Successfully deployed skills to $globalSkillsDir" -ForegroundColor Green
} else {
    Write-Host "Source skills directory not found at $sourceSkillsDir" -ForegroundColor Red
}