# refresh_data.ps1
# Automates re-syncing Excel data to data.js and dashboard_data.json
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host " Central Group - UAT Dashboard Data Refresh Utility " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

$excel = New-Object -ComObject Excel.Application
$excel.Visible = $false
$excel.DisplayAlerts = $false
$excel.AskToUpdateLinks = $false
$excel.EnableEvents = $false

function ExcelDateToString($val) {
    if ($val -is [double] -or $val -is [int]) {
        try {
            $baseDate = [DateTime]::new(1899, 12, 30)
            return $baseDate.AddDays([double]$val).ToString("yyyy-MM-dd")
        } catch {
            return "$val"
        }
    }
    if ($val) { return "$val".Trim() }
    return ""
}

try {
    # 1. Update_Progess_Booking_UAT.xlsx
    $bookingFile = Get-ChildItem -Path $scriptDir -Filter "Update_Progess_Booking_UAT*.xlsx" | Select-Object -First 1
    if (-not $bookingFile) {
        Write-Host "Warning: Update_Progess_Booking_UAT.xlsx not found in $scriptDir" -ForegroundColor Yellow
    } else {
        Write-Host "Processing: $($bookingFile.Name)..." -ForegroundColor Green
        $wb1 = $excel.Workbooks.Open($bookingFile.FullName, $false, $true)
        
        # summary#4
        $wsSum = $wb1.Sheets.Item("summary#4")
        $sumArr = $wsSum.UsedRange.Value2
        $sumRows = $sumArr.GetLength(0)
        $sumCols = $sumArr.GetLength(1)
        
        $timeline = @()
        for ($c = 2; $c -le $sumCols; $c++) {
            $rawDate = $sumArr[4, $c]
            if (-not $rawDate) { continue }
            $dStr = ExcelDateToString $rawDate
            $dayName = "$($sumArr[3, $c])"
            
            $p = 0; $t = 0; $pass = 0
            if ($sumArr[13, $c] -is [double] -or $sumArr[13, $c] -is [int]) { $p = [double]$sumArr[13, $c] }
            if ($sumArr[28, $c] -is [double] -or $sumArr[28, $c] -is [int]) { $t = [double]$sumArr[28, $c] }
            if ($sumArr[43, $c] -is [double] -or $sumArr[43, $c] -is [int]) { $pass = [double]$sumArr[43, $c] }
            
            $planDaily = 0; $testDaily = 0; $passDaily = 0
            if ($sumArr[6, $c] -is [double] -or $sumArr[6, $c] -is [int]) { $planDaily = [double]$sumArr[6, $c] }
            if ($sumArr[20, $c] -is [double] -or $sumArr[20, $c] -is [int]) { $testDaily = [double]$sumArr[20, $c] }
            if ($sumArr[35, $c] -is [double] -or $sumArr[35, $c] -is [int]) { $passDaily = [double]$sumArr[35, $c] }

            $timeline += [PSCustomObject]@{
                Date = $dStr
                Day = $dayName
                PlanDaily = $planDaily
                TestDaily = $testDaily
                PassDaily = $passDaily
                PlanCumulative = $p
                TestCumulative = $t
                PassCumulative = $pass
            }
        }
        
        $overallStats = [PSCustomObject]@{
            TotalPlan = $sumArr[53, 2]
            Pass = $sumArr[54, 2]
            PassPct = $sumArr[54, 3]
            NotPass = $sumArr[55, 2]
            ReadyToTest = $sumArr[56, 2]
            NotStart = $sumArr[57, 2]
        }
        
        $modules = @()
        $moduleRows = @(
            @{ Name="Config"; Row=59 },
            @{ Name="Online"; Row=65 },
            @{ Name="Cross dock"; Row=71 },
            @{ Name="Warehouse"; Row=77 },
            @{ Name="Store"; Row=83 },
            @{ Name="Report"; Row=89 }
        )
        foreach ($m in $moduleRows) {
            [int]$r = [int]$m.Row
            if ($r -le $sumRows) {
                $mName = $m.Name
                $mTotal = if ($sumArr[$r, 2] -ne $null) { [double]$sumArr[$r, 2] } else { 0 }
                [int]$r1 = $r + 1; [int]$r2 = $r + 2; [int]$r3 = $r + 3; [int]$r4 = $r + 4
                $mPass = if ($sumArr[$r1, 2] -ne $null) { [double]$sumArr[$r1, 2] } else { 0 }
                $mNotPass = if ($sumArr[$r2, 2] -ne $null) { [double]$sumArr[$r2, 2] } else { 0 }
                $mReady = if ($sumArr[$r3, 2] -ne $null) { [double]$sumArr[$r3, 2] } else { 0 }
                $mNotStart = if ($sumArr[$r4, 2] -ne $null) { [double]$sumArr[$r4, 2] } else { 0 }
                $modules += [PSCustomObject]@{
                    Module = $mName
                    Total = $mTotal
                    Pass = $mPass
                    NotPass = $mNotPass
                    ReadyToTest = $mReady
                    NotStart = $mNotStart
                }
            }
        }
        
        # Booking Script Test #4
        $wsScript = $wb1.Sheets.Item("Booking Script Test #4")
        $scArr = $wsScript.UsedRange.Value2
        $scRows = $scArr.GetLength(0)
        
        $scriptTests = @()
        for ($r = 2; $r -le $scRows; $r++) {
            $noVal = $scArr[$r, 1]
            $tcVal = $scArr[$r, 5]
            if (-not $noVal -and -not $tcVal) { continue }

            $scriptTests += [PSCustomObject]@{
                No = "$noVal"
                Type = "$($scArr[$r, 2])"
                Function = "$($scArr[$r, 3])"
                FunctionCode = "$($scArr[$r, 4])"
                TestCase = "$($scArr[$r, 5])"
                Team = "$($scArr[$r, 6])"
                UATDate = ExcelDateToString $scArr[$r, 7]
                TestDate = ExcelDateToString $scArr[$r, 8]
                PassDate = ExcelDateToString $scArr[$r, 9]
                Result = "$($scArr[$r, 10])"
                OPSRemark = "$($scArr[$r, 11])"
                RISRemark = "$($scArr[$r, 12])"
                Urgency = "$($scArr[$r, 13])"
                TargetFixDate = ExcelDateToString $scArr[$r, 14]
            }
        }
        $wb1.Close($false)
        Write-Host "Loaded $($scriptTests.Count) booking test cases." -ForegroundColor Green
    }

    # 2. แจ้ง Issue Slot Booking Online UAT 5.xlsx
    $issueFile = Get-ChildItem -Path $scriptDir -Filter "*Issue*.xlsx" | Select-Object -First 1
    if (-not $issueFile) {
        Write-Host "Warning: Issue Excel file not found in $scriptDir" -ForegroundColor Yellow
    } else {
        Write-Host "Processing: $($issueFile.Name)..." -ForegroundColor Green
        $wb2 = $excel.Workbooks.Open($issueFile.FullName, $false, $true)
        $wsIssue = $wb2.Sheets.Item("Data")
        $isArr = $wsIssue.UsedRange.Value2
        $isRows = $isArr.GetLength(0)

        $issues = @()
        for ($r = 2; $r -le $isRows; $r++) {
            $noVal = $isArr[$r, 1]
            $prob = $isArr[$r, 9]
            if (-not $noVal -and -not $prob) { continue }

            $dStr = ExcelDateToString $isArr[$r, 4]
            if (-not $dStr -or $dStr -eq "") {
                $dStr = ExcelDateToString $isArr[$r, 3]
            }

            $cleanProblem = "$prob"
            if ($cleanProblem -eq "-2146826273") { $cleanProblem = "" }
            $cleanRemark = "$($isArr[$r, 21])"
            if ($cleanRemark -eq "-2146826273") { $cleanRemark = "" }
            $cleanOPSComment = "$($isArr[$r, 19])"
            if ($cleanOPSComment -eq "-2146826273") { $cleanOPSComment = "" }
            $cleanRISRemark = "$($isArr[$r, 28])"
            if ($cleanRISRemark -eq "-2146826273") { $cleanRISRemark = "" }

            $issues += [PSCustomObject]@{
                No = "$noVal"
                Name = "$($isArr[$r, 2])"
                Date = $dStr
                MainMenu = "$($isArr[$r, 6])"
                Menu = "$($isArr[$r, 7])"
                Problem = $cleanProblem
                UserLogin = "$($isArr[$r, 10])"
                Datatest = "$($isArr[$r, 11])"
                Urgency = "$($isArr[$r, 12])".Trim()
                Type = "$($isArr[$r, 13])".Trim()
                Result = "$($isArr[$r, 14])".Trim()
                RefIssueNo = "$($isArr[$r, 15])"
                IssueGroup = "$($isArr[$r, 17])"
                CompleteStatus = "$($isArr[$r, 18])"
                OPSComment = $cleanOPSComment
                Remark = $cleanRemark
                RISStatus = "$($isArr[$r, 22])"
                RISUpdate = ExcelDateToString $isArr[$r, 23]
                RISRemark = $cleanRISRemark
                TargetFixDate = ExcelDateToString $isArr[$r, 29]
            }
        }
        $wb2.Close($false)
        Write-Host "Loaded $($issues.Count) issues." -ForegroundColor Green
    }

    # Write output
    $exportObj = [PSCustomObject]@{
        GeneratedAt = (Get-Date).ToString("yyyy-MM-dd HH:mm:ss")
        Timeline = $timeline
        OverallStats = $overallStats
        Modules = $modules
        BookingTests = $scriptTests
        Issues = $issues
    }

    $jsonPath = Join-Path $scriptDir "dashboard_data.json"
    $jsPath = Join-Path $scriptDir "data.js"

    $jsonStr = $exportObj | ConvertTo-Json -Depth 6
    [System.IO.File]::WriteAllText($jsonPath, $jsonStr, [System.Text.Encoding]::UTF8)
    
    $jsStr = "window.DASHBOARD_DATA = " + $jsonStr + ";"
    [System.IO.File]::WriteAllText($jsPath, $jsStr, [System.Text.Encoding]::UTF8)

    Write-Host "`n[SUCCESS] Updated data.js and dashboard_data.json successfully!" -ForegroundColor Cyan
    Write-Host "You can now open or refresh index.html to view updated data.`n"
} catch {
    Write-Host "`n[ERROR] Refresh failed: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    $excel.Quit()
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
}
