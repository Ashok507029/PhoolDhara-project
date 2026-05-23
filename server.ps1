$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://localhost:8080/")
$listener.Start()
Write-Host "Listening on http://localhost:8080/"

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response

    $localPath = $request.Url.LocalPath.TrimStart('/')
    if ($localPath -eq "") { $localPath = "index.html" }
    
    $fullPath = Join-Path "d:\Downloads\phooldhara" $localPath

    if (Test-Path $fullPath -PathType Leaf) {
        $content = [System.IO.File]::ReadAllBytes($fullPath)
        $response.ContentLength64 = $content.Length
        if ($localPath.EndsWith(".html")) { $response.ContentType = "text/html" }
        elseif ($localPath.EndsWith(".css")) { $response.ContentType = "text/css" }
        elseif ($localPath.EndsWith(".js")) { $response.ContentType = "application/javascript" }
        $response.OutputStream.Write($content, 0, $content.Length)
    } else {
        $response.StatusCode = 404
    }
    $response.Close()
}
