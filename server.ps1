# Robust Local Web Server for SUTech HSE System
$port = 5500
$prefix = "http://localhost:$port/"
$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)

try {
    $listener.Start()
    Write-Host "Local web server running at $prefix"
    
    while ($listener.IsListening) {
        try {
            $context = $listener.GetContext()
            $request = $context.Request
            $response = $context.Response
            
            $path = $request.Url.LocalPath
            if ([string]::IsNullOrWhiteSpace($path) -or $path -eq "/") {
                $path = "/index.html"
            }
            
            $localPath = Join-Path "d:\myproject" $path.TrimStart('/')
            
            if (Test-Path $localPath -PathType Leaf) {
                $ext = [System.IO.Path]::GetExtension($localPath).ToLower()
                $contentType = switch ($ext) {
                    ".html" { "text/html; charset=utf-8" }
                    ".css"  { "text/css; charset=utf-8" }
                    ".js"   { "application/javascript; charset=utf-8" }
                    ".json" { "application/json; charset=utf-8" }
                    ".png"  { "image/png" }
                    ".jpg"  { "image/jpeg" }
                    ".jpeg" { "image/jpeg" }
                    ".svg"  { "image/svg+xml; charset=utf-8" }
                    ".ico"  { "image/x-icon" }
                    default { "application/octet-stream" }
                }
                
                $bytes = [System.IO.File]::ReadAllBytes($localPath)
                $response.ContentType = $contentType
                $response.AddHeader("Access-Control-Allow-Origin", "*")
                $response.OutputStream.Write($bytes, 0, $bytes.Length)
            } else {
                $response.StatusCode = 404
                $errBytes = [System.Text.Encoding]::UTF8.GetBytes("404 Not Found")
                $response.OutputStream.Write($errBytes, 0, $errBytes.Length)
            }
            $response.Close()
        } catch {
            # continue listening even if a single client request aborted
        }
    }
} catch {
    Write-Error $_
} finally {
    if ($listener -and $listener.IsListening) {
        $listener.Stop()
    }
}
