$ErrorActionPreference='Stop'
$base='http://localhost:3000/api/v1'
$nonce=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$ownerEmail="phase7_owner_$nonce@example.com"
$cashierEmail="phase7_cashier_$nonce@example.com"
$ownerPassword='Owner@1234!'
$cashierPassword='Cashier@1234!'

$regBody=@{
  businessName="Phase7 Biz $nonce"
  businessType='RETAIL'
  address='Line 1, City'
  phone='9000000001'
  ownerName='Phase7 Owner'
  email=$ownerEmail
  password=$ownerPassword
} | ConvertTo-Json
$reg=Invoke-RestMethod -Method Post -Uri "$base/auth/register" -ContentType 'application/json' -Body $regBody
if (-not $reg.data) { throw 'register failed' }

$ownerLoginBody=@{ email=$ownerEmail; password=$ownerPassword } | ConvertTo-Json
$ownerLogin=Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $ownerLoginBody
$ownerToken=$ownerLogin.data.accessToken
if (-not $ownerToken) { throw 'owner login failed' }
$ownerHeaders=@{ Authorization = "Bearer $ownerToken" }

$updateConfigBody=@{
  businessName='Phase7 Central Config Pvt Ltd'
  gst='29ABCDE1234F1Z5'
  pan='ABCDE1234F'
  fssai='12345678901234'
  address='Bengaluru'
  phone='9000000002'
  email='contact@phase7.example.com'
  website='https://phase7.example.com'
  invoicePrefix='P7INV'
  invoiceSeries='B'
  financialYear='2026-27'
  taxCgst=9
  taxSgst=9
  taxIgst=0
  taxCess=1
  currency='INR'
  language='en-IN'
  timeZone='Asia/Kolkata'
  theme='light'
  dateFormat='DD-MM-YYYY'
  numberFormat='en-IN'
  printerConfiguration=@{
    thermal58mm=@{ enabled=$true; copies=1 }
    thermal80mm=@{ enabled=$true; copies=2 }
    bluetooth=@{ enabled=$true }
    usb=@{ enabled=$true }
    lan=@{ enabled=$true }
    wifi=@{ enabled=$true }
  }
  receiptTemplate=@{ name='default-receipt-v1' }
  invoiceTemplate=@{ name='default-invoice-v1' }
  barcodeSettings=@{ enabled=$true; format='CODE128' }
  qrSettings=@{ enabled=$true; type='UPI' }
  branchManagement=@{ centralized=$true }
  branchSettings=@{ inheritGlobal=$true }
  workingHours=@(@{ day='MON'; open='09:00'; close='21:00' })
  businessStatus=@{ isOpen=$true }
  subscriptionInformation=@{ plan='enterprise' }
  storageSettings=@{ provider='local' }
  backupSettings=@{ frequency='daily' }
  notificationSettings=@{ enabled=$true }
  emailSettings=@{ provider='smtp' }
  smsSettings=@{ provider='twilio' }
  pushNotificationSettings=@{ provider='fcm' }
  securitySettings=@{ mfa=$false }
  passwordPolicy=@{ minLength=8; specialRequired=$true }
  sessionTimeoutMinutes=120
  loginPolicy=@{ maxFailedAttempts=5 }
  featureFlags=@{ advancedReports=$true }
  moduleToggles=@{ billing=$true; reports=$true }
  apiKeys=@{ maps='masked' }
  thirdPartyIntegrations=@{ paymentGateway='razorpay' }
  fileStorageConfiguration=@{ bucket='local-bucket' }
  businessPreferences=@{ offlineFirst=$true }
} | ConvertTo-Json -Depth 20
$cfgUpdate=Invoke-RestMethod -Method Patch -Uri "$base/settings/business-configuration" -Headers $ownerHeaders -ContentType 'application/json' -Body $updateConfigBody
if (-not $cfgUpdate.data -or $cfgUpdate.data.gst -ne '29ABCDE1234F1Z5') { throw 'config update failed' }

$cfgGet=Invoke-RestMethod -Method Get -Uri "$base/settings/business-configuration" -Headers $ownerHeaders
if ($cfgGet.data.invoicePrefix -ne 'P7INV') { throw 'config read failed' }

$featureBody=@{ key='phase7.toggle'; isEnabled=$true } | ConvertTo-Json
$featureRes=Invoke-RestMethod -Method Patch -Uri "$base/settings/business-configuration/feature-flag" -Headers $ownerHeaders -ContentType 'application/json' -Body $featureBody
if (-not $featureRes.data) { throw 'feature flag update failed' }

$moduleBody=@{ module='inventory'; isEnabled=$true } | ConvertTo-Json
$moduleRes=Invoke-RestMethod -Method Patch -Uri "$base/settings/business-configuration/module-toggle" -Headers $ownerHeaders -ContentType 'application/json' -Body $moduleBody
if (-not $moduleRes.data) { throw 'module toggle update failed' }

$tmpFile=Join-Path $env:TEMP "phase7-logo-$nonce.txt"
Set-Content -Path $tmpFile -Value 'phase7-logo-content' -Encoding utf8
$uploadRaw = curl.exe -sS -X POST "$base/settings/business-configuration/upload/LOGO" -H "Authorization: Bearer $ownerToken" -F "file=@$tmpFile"
$uploadRes = $uploadRaw | ConvertFrom-Json
if (-not $uploadRes.data -or $uploadRes.data.type -ne 'LOGO') { throw 'logo upload failed' }

$assets=Invoke-RestMethod -Method Get -Uri "$base/settings/business-configuration/assets?type=LOGO" -Headers $ownerHeaders
if (-not $assets.data -or $assets.data.Count -lt 1) { throw 'assets fetch failed' }

$tax=Invoke-RestMethod -Method Get -Uri "$base/settings/business-configuration/tax" -Headers $ownerHeaders
if ($tax.data.defaultTaxPercent -ne 19) { throw 'tax config read failed' }

$invoiceCfg=Invoke-RestMethod -Method Get -Uri "$base/settings/business-configuration/invoice" -Headers $ownerHeaders
if ($invoiceCfg.data.company.gst -ne '29ABCDE1234F1Z5') { throw 'invoice config read failed' }

$reportCfg=Invoke-RestMethod -Method Get -Uri "$base/settings/business-configuration/report" -Headers $ownerHeaders
if (-not $reportCfg.data) { throw 'report config read failed' }

$printerCfg=Invoke-RestMethod -Method Get -Uri "$base/settings/business-configuration/printer" -Headers $ownerHeaders
if (-not $printerCfg.data) { throw 'printer config read failed' }

$createStaffBody=@{
  name='Phase7 Cashier'
  email=$cashierEmail
  password=$cashierPassword
  role='CASHIER'
  phone='9000000003'
} | ConvertTo-Json
$staff=Invoke-RestMethod -Method Post -Uri "$base/auth/staff" -Headers $ownerHeaders -ContentType 'application/json' -Body $createStaffBody
if (-not $staff.data) { throw 'staff create failed' }

$cashierLoginBody=@{ email=$cashierEmail; password=$cashierPassword } | ConvertTo-Json
$cashierLogin=Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $cashierLoginBody
$cashierToken=$cashierLogin.data.accessToken
if (-not $cashierToken) { throw 'cashier login failed' }
$cashierHeaders=@{ Authorization = "Bearer $cashierToken" }

$denied=$false
try {
  Invoke-RestMethod -Method Patch -Uri "$base/settings/business-configuration" -Headers $cashierHeaders -ContentType 'application/json' -Body (@{ businessName='ShouldFail' } | ConvertTo-Json) | Out-Null
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 403) { $denied=$true } else { throw }
}
if (-not $denied) { throw 'permission check failed' }

$docBody=@{
  type='POS_BILL'
  isInclusiveTax=$false
  items=@(
    @{ description='Test Item A'; quantity=2; unitPrice=100 }
  )
} | ConvertTo-Json -Depth 8
$doc=Invoke-RestMethod -Method Post -Uri "$base/billing-pos/documents" -Headers $ownerHeaders -ContentType 'application/json' -Body $docBody
if (-not $doc.data) { throw 'billing create failed' }
if ($doc.data.configuration.invoice.company.gst -ne '29ABCDE1234F1Z5') { throw 'billing invoice config integration failed' }
if ($doc.data.configuration.invoice.company.businessName -ne 'Phase7 Central Config Pvt Ltd') { throw 'billing company config integration failed' }
if (-not $doc.data.configuration.printer) { throw 'billing printer config integration failed' }
if ($doc.data.documentNo -notmatch '^P7INV-B-2026-27-') { throw 'invoice numbering integration failed' }

$docRead=Invoke-RestMethod -Method Get -Uri "$base/billing-pos/documents/$($doc.data.id)" -Headers $ownerHeaders
if ($docRead.data.configuration.invoice.company.gst -ne '29ABCDE1234F1Z5') { throw 'billing read config integration failed' }

Write-Output 'API_CHECKS_OK'
