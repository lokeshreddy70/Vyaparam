$ErrorActionPreference='Stop'
$base='http://localhost:3000/api/v1'
$nonce=[DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()
$ownerEmail="phase8_owner_$nonce@example.com"
$cashierEmail="phase8_cashier_$nonce@example.com"
$ownerPassword='Owner@1234!'
$cashierPassword='Cashier@1234!'

$from=(Get-Date).AddDays(-30).ToString('o')
$to=(Get-Date).ToString('o')

$regBody=@{
  businessName="Phase8 Biz $nonce"
  businessType='RETAIL'
  address='Phase8 Addr'
  phone='9000000101'
  ownerName='Phase8 Owner'
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

# Ensure at least one sales document exists for real-data report aggregation
$docBody=@{
  type='POS_BILL'
  isInclusiveTax=$false
  items=@(
    @{ description='Phase8 Item'; quantity=1; unitPrice=250 }
  )
} | ConvertTo-Json -Depth 8
$doc=Invoke-RestMethod -Method Post -Uri "$base/billing-pos/documents" -Headers $ownerHeaders -ContentType 'application/json' -Body $docBody
if (-not $doc.data) { throw 'seed billing document failed' }

$createStaffBody=@{
  name='Phase8 Cashier'
  email=$cashierEmail
  password=$cashierPassword
  role='CASHIER'
  phone='9000000102'
} | ConvertTo-Json
$staff=Invoke-RestMethod -Method Post -Uri "$base/auth/staff" -Headers $ownerHeaders -ContentType 'application/json' -Body $createStaffBody
if (-not $staff.data) { throw 'staff create failed' }

$cashierLoginBody=@{ email=$cashierEmail; password=$cashierPassword } | ConvertTo-Json
$cashierLogin=Invoke-RestMethod -Method Post -Uri "$base/auth/login" -ContentType 'application/json' -Body $cashierLoginBody
$cashierToken=$cashierLogin.data.accessToken
if (-not $cashierToken) { throw 'cashier login failed' }
$cashierHeaders=@{ Authorization = "Bearer $cashierToken" }

$reportPaths=@(
  '/reports-analytics/dashboard',
  '/reports-analytics/inventory/current-stock',
  '/reports-analytics/inventory/stock-valuation',
  '/reports-analytics/inventory/low-stock',
  '/reports-analytics/inventory/out-of-stock',
  '/reports-analytics/inventory/fast-moving-products',
  '/reports-analytics/inventory/slow-moving-products',
  '/reports-analytics/inventory/dead-stock',
  '/reports-analytics/inventory/movement',
  '/reports-analytics/inventory/stock-adjustment-history',
  '/reports-analytics/sales/top-products',
  '/reports-analytics/sales/top-categories',
  '/reports-analytics/sales/top-customers',
  '/reports-analytics/sales/top-employees',
  '/reports-analytics/sales/top-branches',
  '/reports-analytics/sales/hourly',
  '/reports-analytics/sales/daily',
  '/reports-analytics/sales/monthly',
  '/reports-analytics/sales/cancelled-bills',
  '/reports-analytics/sales/returned-bills',
  '/reports-analytics/sales/discount',
  '/reports-analytics/sales/payment-method',
  '/reports-analytics/purchase/supplier-purchases',
  '/reports-analytics/purchase/pending',
  '/reports-analytics/purchase/history',
  '/reports-analytics/purchase/supplier-ledger',
  '/reports-analytics/customer/outstanding-balance',
  '/reports-analytics/customer/ledger',
  '/reports-analytics/customer/purchase-history',
  '/reports-analytics/customer/loyal',
  '/reports-analytics/financial/profit-loss',
  '/reports-analytics/financial/cash-book',
  '/reports-analytics/financial/income',
  '/reports-analytics/financial/expense',
  '/reports-analytics/financial/tax',
  '/reports-analytics/charts'
)

foreach ($path in $reportPaths) {
  $uri = "${base}${path}?fromDate=$([uri]::EscapeDataString($from))&toDate=$([uri]::EscapeDataString($to))&page=1&limit=10&paymentMethod=CASH&invoiceStatus=CONFIRMED"
  $res = Invoke-RestMethod -Method Get -Uri $uri -Headers $ownerHeaders
  if ($null -eq $res.data) {
    throw "missing data wrapper for $path"
  }
}

# Export verification: CSV, Excel, PDF, Print
$exportCases=@(
  @{ key='dashboard'; format='CSV'; expected='text/csv' },
  @{ key='sales-top-products'; format='EXCEL'; expected='application/vnd.ms-excel' },
  @{ key='financial-profit-loss'; format='PDF'; expected='application/pdf' },
  @{ key='charts'; format='PRINT'; expected='text/html' }
)

foreach ($ec in $exportCases) {
  $uri="${base}/reports-analytics/export/$($ec.key)?format=$($ec.format)&fromDate=$([uri]::EscapeDataString($from))&toDate=$([uri]::EscapeDataString($to))"
  $web=Invoke-WebRequest -Method Get -Uri $uri -Headers $ownerHeaders -UseBasicParsing
  if ($web.StatusCode -ne 200) { throw "export failed for $($ec.key) $($ec.format)" }
  if (-not ($web.Headers['Content-Type'] -like "*$($ec.expected)*")) { throw "export content-type mismatch for $($ec.format)" }
}

# Permission verification for reports endpoint
$denied=$false
try {
  Invoke-RestMethod -Method Get -Uri "$base/reports-analytics/dashboard" -Headers $cashierHeaders | Out-Null
} catch {
  if ($_.Exception.Response.StatusCode.value__ -eq 403) {
    $denied=$true
  } else {
    throw
  }
}
if (-not $denied) { throw 'reports permission verification failed' }

Write-Output 'PHASE8_REPORTS_CHECKS_OK'
