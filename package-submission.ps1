# package-submission.ps1
# This script packages only the git-tracked files into a submission.zip file.
# This prevents target/ and node_modules/ from inflating the upload and causing budget/size limits errors.

$ErrorActionPreference = "Stop"

Write-Host "==> Checking git availability..." -ForegroundColor Cyan
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Error "Git is not installed or not in the PATH. Git is required to use this script."
}

# Ensure we are in the root directory by checking for Cargo.toml
if (-not (Test-Path "Cargo.toml")) {
    Write-Error "Please run this script from the project root directory (which contains Cargo.toml)."
}

# Output zip filename
$ZipName = "submission.zip"

Write-Host "==> Packaging tracked files into $ZipName using git archive..." -ForegroundColor Cyan
if (Test-Path $ZipName) {
    Remove-Item $ZipName -Force
}

# Run git archive to bundle only git-tracked files
git archive -o $ZipName HEAD

if (Test-Path $ZipName) {
    $Size = (Get-Item $ZipName).Length
    $SizeKB = [Math]::Round($Size / 1KB, 2)
    Write-Host "`n==================================================" -ForegroundColor Green
    Write-Host "Success! Generated: $ZipName ($SizeKB KB)" -ForegroundColor Green
    Write-Host "This file contains all your source code (Cargo.lock, frontend files, deploy scripts)" -ForegroundColor Green
    Write-Host "but excludes heavy target/ and node_modules/ folders." -ForegroundColor Green
    Write-Host "Upload this ZIP file for grading to stay under budget limits." -ForegroundColor Green
    Write-Host "==================================================" -ForegroundColor Green
} else {
    Write-Error "Failed to generate $ZipName."
}
