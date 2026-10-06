import csv
import hashlib
import io
import json
import math
import re
import time
import urllib.parse
import urllib.request
from collections import defaultdict
from datetime import date, datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
CUTOFF = '2026-10-03'
ENDPOINT = 'https://publicreporting.cftc.gov/resource/gpe5-46if'
CONTRACTS = {
    '020601': ('传统长期国债', 100000),
    '020604': ('超长期国债', 100000),
    '042601': ('2年期国债', 200000),
    '043602': ('10年期国债', 100000),
    '043607': ('超10年期国债', 100000),
    '044601': ('5年期国债', 100000),
}
GROUPS = {
    'asset_manager': ('asset_mgr_positions_long', 'asset_mgr_positions_short'),
    'other_reportables': ('other_rept_positions_long', 'other_rept_positions_short'),
    'leveraged_money': ('lev_money_positions_long', 'lev_money_positions_short'),
    'dealer': ('dealer_positions_long_all', 'dealer_positions_short_all'),
    'nonreportable': ('nonrept_positions_long_all', 'nonrept_positions_short_all'),
}


def fetch(url):
    for attempt in range(3):
        try:
            request = urllib.request.Request(url, headers={'User-Agent': 'CFTC-research-chart/1.0'})
            with urllib.request.urlopen(request, timeout=120) as response:
                return response.read()
        except Exception:
            if attempt == 2:
                raise
            time.sleep(2 ** attempt)


def write_csv(filename, rows):
    with (ROOT / filename).open('w', encoding='utf-8-sig', newline='') as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def make_chart(records, filename, end_date):
    visible = [record for record in records if record['date'] <= end_date]
    earliest, latest = date(2006, 1, 1), date.fromisoformat(end_date)
    left, top, width, height = 142, 220, 1220, 565
    bound = max(1000, math.ceil(max(abs(record[key]) for record in visible for key in ['asset_manager_net_usd_bn', 'other_reportables_net_usd_bn']) / 200) * 200)
    step = 200 if bound <= 1200 else 400
    bound = math.ceil(bound / step) * step

    def xpos(value):
        return left + (date.fromisoformat(value) - earliest).days / (latest - earliest).days * width

    def ypos(value):
        return top + height * (bound - value) / (2 * bound)

    parts = ['<svg xmlns="http://www.w3.org/2000/svg" width="1560" height="990" viewBox="0 0 1560 990" role="img" aria-labelledby="title desc">',
             '<title id="title">美国国债期货：资管与其他机构净持仓</title>',
             '<desc id="desc">绿色为资管及机构投资者，蓝色为其他可报告交易者。数据始于2006年6月13日；此前无该分类可比数据。</desc>',
             '<rect width="1560" height="990" fill="#f4f4f0"/>',
             '<rect x="24" y="24" width="1512" height="942" rx="24" fill="white"/>',
             '<g font-family="Microsoft YaHei, sans-serif">',
             '<rect x="60" y="57" width="308" height="74" rx="12" fill="#f1df63"/>',
             '<text x="83" y="89" font-size="25" font-weight="700" fill="#484522">美国国债期货</text>',
             '<text x="84" y="113" font-size="15" fill="#66613c" letter-spacing="1.1">U.S. TREASURY FUTURES</text>',
             '<text x="398" y="91" font-size="26" font-weight="700" fill="#26312b">资管与其他机构：净持仓</text>',
             f'<text x="400" y="123" font-size="16" fill="#6e7771">2006-06-13 — {visible[-1]["date"]} · 每周净持仓 · Futures Only</text>',
             '<text x="142" y="173" font-size="18" fill="#525b55">十亿美元面值</text>',
             '<text x="142" y="198" font-size="14" fill="#828a84">净持仓 = 多头 − 空头</text>',
             '<text x="252" y="414" font-size="146" font-weight="700" fill="#7472e5" opacity="0.15">多头</text>',
             '<text x="252" y="730" font-size="146" font-weight="700" fill="#d54b62" opacity="0.13">空头</text>']
    for value in range(-bound, bound + 1, step):
        position = ypos(value)
        color, thickness = ('#b85462', 2) if value == 0 else ('#e1e5e2', 1)
        parts.append(f'<line x1="{left}" y1="{position}" x2="{left + width}" y2="{position}" stroke="{color}" stroke-width="{thickness}" stroke-dasharray="5 7"/>')
        parts.append(f'<text x="{left-18}" y="{position+6}" text-anchor="end" font-size="17" fill="#828984">{value:,}</text>')
    parts.append(f'<path d="M {left} {top} V {top+height} H {left+width}" fill="none" stroke="#9ea7a0" stroke-width="1.5"/>')
    for year in range(2006, latest.year + 1):
        position = xpos(f'{year}-01-01')
        parts.append(f'<text x="{position}" y="{top+height+30}" text-anchor="middle" font-size="14" fill="#808983">{year}</text>')
    for key, color, name, label_top in [
        ('asset_manager_net_usd_bn', '#64844c', '资管 / 机构投资者', 160),
        ('other_reportables_net_usd_bn', '#4f62ae', '其他可报告交易者', 190),
    ]:
        path, previous = '', None
        for record in visible:
            current = date.fromisoformat(record['date'])
            command = 'M' if previous is None or (current - previous).days > 8 else 'L'
            path += f'{command}{xpos(record["date"]):.2f},{ypos(record[key]):.2f} '
            previous = current
        parts.append(f'<path d="{path}" fill="none" stroke="{color}" stroke-width="3.3" stroke-linejoin="round" stroke-linecap="round"/>')
        parts.append(f'<line x1="830" y1="{label_top-5}" x2="863" y2="{label_top-5}" stroke="{color}" stroke-width="4"/>')
        parts.append(f'<text x="878" y="{label_top}" font-size="18" font-weight="700" fill="{color}">{name}</text>')
        last = visible[-1]
        point_x, point_y = xpos(last['date']), ypos(last[key])
        parts.append(f'<circle cx="{point_x}" cy="{point_y}" r="4.4" fill="{color}"/>')
        parts.append(f'<text x="{left+width+14}" y="{point_y+6}" font-size="18" font-weight="700" fill="{color}">{last[key]:,.1f}</text>')
    parts.extend([
        '<text x="142" y="861" font-size="17" fill="#4f5b52">口径：六类标准面值国债期货，各合约自首次可用报告起纳入；不含期权。</text>',
        '<text x="142" y="892" font-size="16" fill="#748078">来源：CFTC · TFF – Futures Only（gpe5-46if）｜公开数据重建，未能逐点确认原视频口径。</text>',
        '<text x="142" y="923" font-size="16" fill="#748078">1900—2006-06-12：无该分类可比数据，未补零或插值。保险公司属于资管 / 机构分类。</text>',
        '</g></svg>',
    ])
    (ROOT / filename).write_text('\n'.join(parts), encoding='utf-8')


def write_notes(audit):
    latest = audit['latest']
    coverage_lines = '\n'.join(f'| {item["contract_code"]} | {item["contract_name_zh"]} | {item["face_value_usd"]:,} | {item["first_date"]} | {item["last_date"]} | {item["rows"]} |' for item in audit['coverage'])
    text = f"""# 美国国债期货持仓：截图口径重建

## 时间范围与交付

用户请求1900—2026年，但该图所需的TFF机构分类不具备1900年以来的同口径历史记录。本次实际取得 **{audit['first_date']}—{audit['last_date']}**，共 **{audit['raw_report_dates']:,}个报告日**，其中 **{audit['weekly_rows']:,}期**通过完整性检查并用于汇总图。2026年不是全年数据。1900—2006-06-12没有补零、插值，也没有把旧版商业/非商业分类拼接成资管机构分类。

- 复刻图_2006-2023.png / .svg：绿蓝双线、红色零线、多头/空头水印、白底黄色标题，至2023年最后一期。
- 更新图_2006-2026.png / .svg：相同方法延伸至本次实际可用的最后一期。
- 原视频没有提供合约清单、精确截止日和完整出处，因此这是可复现的近似口径重建，不声称逐点一致。没有平滑或调整数据贴合截图。

## 官方来源与获取

- 数据集：CFTC **TFF - Futures Only**，ID `gpe5-46if`。
- 入口：https://publicreporting.cftc.gov/d/gpe5-46if
- 元数据：https://publicreporting.cftc.gov/api/views/gpe5-46if.json
- 实际CSV查询：{audit['query_url']}
- COT说明：https://www.cftc.gov/MarketReports/CommitmentsofTraders/index.htm
- 分类说明：https://www.cftc.gov/idc/groups/public/%40commitmentsoftraders/documents/file/tfmexplanatorynotes.pdf
- 历史下载：https://www.cftc.gov/MarketReports/CommitmentsofTraders/HistoricalCompressed/index.htm

完整下载时间、查询地址及SHA-256见 `数据核验与来源.json`。官方API原始响应按字节原样保留。

## 换算与解释

仅期货，不含期权；每个报告日、每个合约先算：

`净持仓面值（美元） = (多头合约张数 − 空头合约张数) × 单张合约面值`

再跨合约汇总并除以1,000,000,000，得到“十亿美元面值”。先用整数美元计算，避免浮点累计误差。面值不是市值、保证金、资金净流入、DV01或期限调整后的风险敞口；各期限利率风险不能视为相等。

| 曲线 | 多头API字段 | 空头API字段 |
| --- | --- | --- |
| 资管/机构 | asset_mgr_positions_long | asset_mgr_positions_short |
| 其他可报告交易者 | other_rept_positions_long | other_rept_positions_short |

字段名来自实际API，可能与其他格式的CFTC文件不同。Spreading不单独加到净持仓。官方将保险公司列在资管/机构分类，本次不照搬截图“其他（保险公司等）”标签。分类不等于投资动机，不能判断每笔交易是投机还是对冲。

## 合约清单

| CFTC代码 | 名称 | 单张面值（美元） | 首个可用报告 | 最后报告 | 记录数 |
| --- | --- | ---: | --- | --- | ---: |
{coverage_lines}

按合约代码而不是会变化的名称识别。各合约从首次可用报告起纳入，这不一定等于交易所上市日；本图不是从2006年就固定包含六个品种的篮子。

本次该商品子组没有返回3年期国债记录，未假定其为零。原始文件保留了不纳入图表的回购及微型收益率合约，排除清单见核验JSON；这些合约不能直接混入标准国债面值汇总。

## 数据与核验

- 官方count与原始文件均为{audit['raw_rows']:,}行；纳入计算{audit['included_rows']:,}个合约-报告日记录，无重复。
- 每行单张面值与官方 `contract_units` 一致。
- 五类交易者净张数逐行相加均为零。
- 缺失记录：{json.dumps(audit['incomplete_dates_omitted_from_aggregate'], ensure_ascii=False)}。这些报告日不进入汇总CSV，原始数据与合约明细仍保留，不把缺失品种当成零。
- 汇总日期间隔超过8天共{len(audit['gaps_over_eight_days'])}处，图上断线，不插值。缺失原因未经确认，不将没有公开记录解释为零持仓。
- 最新一期{audit['last_date']}：资管/机构 **{latest['asset_manager_net_usd_bn']:,.4f} 十亿美元**，其他可报告交易者 **{latest['other_reportables_net_usd_bn']:,.4f} 十亿美元**。

## 文件

- `CFTC_TFF_US_Treasury_原始记录.csv`：官方原始API响应，全部返回字段。
- `按合约净持仓明细.csv`：六类合约、多空张数、面值和整数美元净持仓，含全部五类交易者，方便复核。
- `每周汇总_净持仓面值.csv`：每周聚合，可直接画图。加工CSV采用UTF-8 BOM，便于Excel读取。
- `合约覆盖范围.csv`：实际合约覆盖日期。
- `reproduce.py`：Python标准库下载、校验、计算及SVG绘图脚本。固定查询截止{CUTOFF}；已有原始文件时复用本地快照，缺少时才下载。若希望另行取得修订值，请在新目录中运行，不覆盖此次快照。PNG为SVG的浏览器渲染版。
"""
    (ROOT / '数据来源与复刻说明.md').write_text(text, encoding='utf-8')


def main():
    where = f"commodity_subgroup_name='Interest Rates - U.S. Treasury' AND report_date_as_yyyy_mm_dd <= '{CUTOFF}T23:59:59'"
    query = ENDPOINT + '.csv?' + urllib.parse.urlencode({'$where': where, '$order': 'report_date_as_yyyy_mm_dd,cftc_contract_market_code', '$limit': 50000})
    raw_path = ROOT / 'CFTC_TFF_US_Treasury_原始记录.csv'
    if not raw_path.exists():
        raw_path.write_bytes(fetch(query))
    raw = raw_path.read_bytes()
    metadata_path = ROOT / 'CFTC_dataset_metadata.json'
    if not metadata_path.exists():
        metadata_path.write_bytes(fetch('https://publicreporting.cftc.gov/api/views/gpe5-46if.json'))
    count_url = ENDPOINT + '.json?' + urllib.parse.urlencode({'$where': where, '$select': 'count(*)'})
    count = int(json.loads(fetch(count_url))[0]['count'])
    rows = list(csv.DictReader(io.StringIO(raw.decode('utf-8-sig'))))
    assert len(rows) == count and len(rows) < 50000
    selected = [row for row in rows if row['cftc_contract_market_code'] in CONTRACTS]
    seen, details = set(), []
    by_date, availability = defaultdict(list), defaultdict(list)
    for row in selected:
        code = row['cftc_contract_market_code']
        report_date = row['report_date_as_yyyy_mm_dd'][:10]
        key = (report_date, code)
        assert key not in seen, f'Duplicate: {key}'
        seen.add(key)
        assert row['futonly_or_combined'] == 'FutOnly'
        face_value = CONTRACTS[code][1]
        parsed_face = int(re.search(r'\$([\d,]+)', row['contract_units']).group(1).replace(',', ''))
        assert face_value == parsed_face
        observation = {'date': report_date, 'contract_code': code, 'contract_name': row['contract_market_name'], 'contract_name_zh': CONTRACTS[code][0], 'face_value_usd_per_contract': face_value}
        net_sum = 0
        for group, (long_field, short_field) in GROUPS.items():
            long_count, short_count = int(row[long_field]), int(row[short_field])
            assert min(long_count, short_count) >= 0
            net_count = long_count - short_count
            observation[group + '_long_contracts'] = long_count
            observation[group + '_short_contracts'] = short_count
            observation[group + '_net_contracts'] = net_count
            observation[group + '_net_usd'] = net_count * face_value
            net_sum += net_count
        assert net_sum == 0, f'Net positions do not sum to zero: {key}'
        details.append(observation)
        by_date[report_date].append(observation)
        availability[code].append(report_date)
    summaries, missing_contracts = [], []
    for report_date, observations in sorted(by_date.items()):
        expected = {code for code, dates in availability.items() if min(dates) <= report_date <= max(dates)}
        actual = {observation['contract_code'] for observation in observations}
        if expected != actual:
            missing_contracts.append({'date': report_date, 'missing_codes': sorted(expected - actual)})
            continue
        summary = {'date': report_date, 'contracts_included': len(observations)}
        for group in GROUPS:
            net_usd = sum(observation[group + '_net_usd'] for observation in observations)
            summary[group + '_net_usd'] = net_usd
            summary[group + '_net_usd_bn'] = net_usd / 1_000_000_000
        summaries.append(summary)
    dates = [date.fromisoformat(record['date']) for record in summaries]
    gaps = [{'previous': str(previous), 'next': str(current), 'days': (current - previous).days} for previous, current in zip(dates, dates[1:]) if (current - previous).days > 8]
    write_csv('按合约净持仓明细.csv', details)
    write_csv('每周汇总_净持仓面值.csv', summaries)
    coverage = [{'contract_code': code, 'contract_name_zh': CONTRACTS[code][0], 'face_value_usd': CONTRACTS[code][1], 'first_date': min(values), 'last_date': max(values), 'rows': len(values)} for code, values in sorted(availability.items())]
    write_csv('合约覆盖范围.csv', coverage)
    excluded = sorted({(row['cftc_contract_market_code'], row['contract_market_name'], row['contract_units']) for row in rows if row['cftc_contract_market_code'] not in CONTRACTS})
    audit = {'retrieved_at': datetime.now(timezone.utc).isoformat(), 'cutoff': CUTOFF, 'query_url': query, 'raw_sha256': hashlib.sha256(raw).hexdigest(), 'raw_rows': len(rows), 'included_rows': len(selected), 'raw_report_dates': len(by_date), 'weekly_rows': len(summaries), 'first_date': summaries[0]['date'], 'last_date': summaries[-1]['date'], 'latest': summaries[-1], 'coverage': coverage, 'excluded': excluded, 'gaps_over_eight_days': gaps, 'net_positions_zero_sum': True, 'incomplete_dates_omitted_from_aggregate': missing_contracts}
    audit['retrieved_at'] = datetime.fromtimestamp(raw_path.stat().st_mtime, timezone.utc).isoformat()
    (ROOT / '数据核验与来源.json').write_text(json.dumps(audit, ensure_ascii=False, indent=2), encoding='utf-8')
    make_chart(summaries, '复刻图_2006-2023.svg', '2023-12-31')
    make_chart(summaries, '更新图_2006-2026.svg', summaries[-1]['date'])
    write_notes(audit)
    print(json.dumps(audit, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
