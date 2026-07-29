$word = New-Object -ComObject Word.Application
$word.Visible = $false
$basePath = "C:\Users\Asus\Desktop\dhyana stays\anti gravity\all ui ux\369 dhyana"

$docs = @(
    "models1 .docx",
    "models2.docx",
    "models3.docx",
    "models4.docx",
    "models5.docx",
    "models6.docx",
    "models7.docx",
    "models8.docx",
    "models9.docx",
    "models10.docx",
    "models11.docx",
    "models12.docx",
    "models13.docx",
    "models14.docx",
    "models15.docx",
    "models16.docx",
    "models17.docx",
    "models18.docx",
    "models19.docx",
    "models20.docx",
    "models21.docx",
    "models22.docx",
    "models23.docx",
    "models24.docx",
    "models25 .docx",
    "models26.docx",
    "models27.docx",
    "models28.docx",
    "models29.docx",
    "models30.docx",
    "models31.docx",
    "models32.docx",
    "models33.docx",
    "models34.docx",
    "34 models .docx"
)

foreach ($doc in $docs) {
    $fullPath = Join-Path $basePath $doc
    if (Test-Path $fullPath) {
        Write-Host "========== FILE: $doc =========="
        $d = $word.Documents.Open($fullPath)
        Write-Host $d.Content.Text
        $d.Close()
        Write-Host ""
    } else {
        Write-Host "========== FILE NOT FOUND: $doc =========="
    }
}

$word.Quit()
