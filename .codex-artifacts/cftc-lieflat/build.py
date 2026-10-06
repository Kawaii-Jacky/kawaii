import csv
import json
import re
from pathlib import Path

ROOT = Path.cwd()
SKILL = ROOT / 'lieflat-charts'
OUTPUT = ROOT / '世界经济政治/attachments/CFTC美国国债期货持仓_2006-2026'
WORK = Path(__file__).resolve().parent
with (OUTPUT / '每周汇总_净持仓面值.csv').open(encoding='utf-8-sig') as handle:
    summary = list(csv.DictReader(handle))
with (OUTPUT / 'CFTC_TFF_US_Treasury_原始记录.csv').open(encoding='utf-8-sig') as handle:
    raw = list(csv.DictReader(handle))
contracts = {'020601':100000,'020604':100000,'042601':200000,'043602':100000,'043607':100000,'044601':100000}
gross = {}
for row in raw:
    code = row['cftc_contract_market_code']
    if code not in contracts:
        continue
    report_date = row['report_date_as_yyyy_mm_dd'][:10]
    values = gross.setdefault(report_date, [0, 0])
    spread = int(row['lev_money_positions_spread'])
    for position, field in enumerate(['lev_money_positions_long', 'lev_money_positions_short']):
        values[position] += (int(row[field]) + spread) * contracts[code]
    for side in ['long', 'short']:
        total = int(row[f'dealer_positions_{side}_all']) + int(row[f'asset_mgr_positions_{side}']) + int(row[f'lev_money_positions_{side}']) + int(row[f'other_rept_positions_{side}']) + int(row[f'nonrept_positions_{side}_all'])
        total += sum(int(row[field]) for field in ['dealer_positions_spread_all','asset_mgr_positions_spread','lev_money_positions_spread','other_rept_positions_spread'])
        assert total == int(row['open_interest_all'])
groups = ['asset_manager', 'leveraged_money', 'dealer', 'other_reportables', 'nonreportable']
payload = []
for row in summary:
    net_dollars = [int(row[group + '_net_usd']) for group in groups]
    assert sum(net_dollars) == 0
    long_dollars, short_dollars = gross[row['date']]
    assert long_dollars - short_dollars == net_dollars[1]
    payload.append([row['date']] + [value / 1e9 for value in net_dollars] + [long_dollars / 1e9, short_dollars / 1e9])
presets = (SKILL / 'color-presets.js').read_text(encoding='utf-8')
palette = re.search(r'const PALM = (\{.*?\n  \});', presets, re.S).group(1)
template = (WORK / 'chart.template.html').read_text(encoding='utf-8')
replacements = {
    '__DATA__': json.dumps(payload, separators=(',', ':')),
    '__MONO__': (SKILL / 'mono-tokens.js').read_text(encoding='utf-8'),
    '__PALETTE__': palette,
    '__ECHARTS__': (WORK / 'echarts.min.js').read_text(encoding='utf-8'),
    '__APP__': (WORK / 'app.js').read_text(encoding='utf-8'),
    '__GALLERY__': (WORK / 'gallery.js').read_text(encoding='utf-8'),
}
for placeholder, value in replacements.items():
    template = template.replace(placeholder, value.replace('</script', '<\\/script'))
assert all(placeholder not in template for placeholder in replacements)
(OUTPUT / 'Lieflat_美国国债期货持仓.html').write_text(template, encoding='utf-8')
with (OUTPUT / 'Lieflat_五类净持仓与杠杆多空总量.csv').open('w',encoding='utf-8-sig',newline='') as handle:
    writer = csv.writer(handle)
    writer.writerow(['date']+[group+'_net_usd_bn' for group in groups]+['leveraged_long_including_spread_usd_bn','leveraged_short_including_spread_usd_bn'])
    writer.writerows(payload)
for index, script in enumerate(re.findall(r'<script>(.*?)</script>',template,re.S)):
    (WORK / f'check-{index}.js').write_text(script,encoding='utf-8')
print(json.dumps({'rows':len(payload),'last':payload[-1],'output':str(OUTPUT/'Lieflat_美国国债期货持仓.html')},ensure_ascii=False))
