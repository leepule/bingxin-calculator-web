import { workbookData } from '../legacy.js';
import { formatNumber } from '../lib/format.js';
import { Metric, SectionTitle } from '../components/ui.jsx';

function thresholdPosition(rows, key, currentHaste) {
  const validRows = rows.filter((row) => Number.isFinite(Number(row[key]))).sort((left, right) => left[key] - right[key]);
  let previous = validRows[0];
  let next = validRows[validRows.length - 1];
  for (const row of validRows) {
    if (row[key] <= currentHaste) previous = row;
    if (row[key] > currentHaste) {
      next = row;
      break;
    }
  }
  return { previous, next };
}

export default function Haste() {
  const currentHaste = Number(workbookData.main.stats['加速']);
  const regularPosition = thresholdPosition(workbookData.haste.regular, '加速阈值', currentHaste);
  const boundaryPosition = thresholdPosition(workbookData.haste.boundary, '无界阈值', currentHaste);
  const thresholdDistance = regularPosition.next['加速阈值'] - regularPosition.previous['加速阈值'];
  const progress = Math.max(0, Math.min(100, (currentHaste - regularPosition.previous['加速阈值']) / Math.max(1, thresholdDistance) * 100));
  const headers = Object.keys(workbookData.haste.regular[0]);

  return (
    <section>
      <SectionTitle eyebrow="Haste Breakpoints" title="加速档位" description={`根据当前 ${formatNumber(currentHaste)} 加速定位常规循环与无界循环阈值`} />
      <div className="grid gap-5 xl:grid-cols-[1.2fr_.8fr]">
        <article className="card p-6">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div><p className="metric-label">当前加速</p><p className="mt-2 text-5xl font-semibold tracking-tight text-white">{formatNumber(currentHaste)}</p></div>
            <div className="grid grid-cols-2 gap-3 sm:min-w-72"><Metric label="当前档位" value={formatNumber(regularPosition.previous['加速阈值'])} /><Metric label="下一档位" value={formatNumber(regularPosition.next['加速阈值'])} /></div>
          </div>
          <div className="mt-8">
            <div className="mb-2 flex justify-between text-xs text-stone-600"><span>{formatNumber(regularPosition.previous['加速阈值'])}</span><span>还差 {formatNumber(Math.max(0, regularPosition.next['加速阈值'] - currentHaste))}</span><span>{formatNumber(regularPosition.next['加速阈值'])}</span></div>
            <div className="h-3 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-violet-400" style={{ width: `${progress}%` }} /></div>
          </div>
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric label="公共 CD" value={formatNumber(regularPosition.previous['公共CD'], 4)} />
            <Metric label="0 舞玳" value={formatNumber(regularPosition.previous['0舞玳'], 4)} />
            <Metric label="3 舞霜降玳" value={formatNumber(regularPosition.previous['3舞霜降玳'], 4)} />
            <Metric label="5 舞霜降玳" value={formatNumber(regularPosition.previous['5舞霜降玳'], 4)} />
          </div>
        </article>
        <article className="card p-6">
          <SectionTitle eyebrow="Boundless" title="无界循环定位" description="当前值所在的无界阈值区间" />
          <div className="grid grid-cols-2 gap-3"><Metric label="当前无界档" value={formatNumber(boundaryPosition.previous['无界阈值'])} /><Metric label="下一无界档" value={formatNumber(boundaryPosition.next['无界阈值'])} /></div>
          <div className="mt-5 rounded-xl border border-violet-400/15 bg-violet-400/[0.06] p-5">
            <p className="text-xs text-violet-300/70">当前档参数</p>
            <div className="mt-4 flex items-end justify-between gap-4"><div><p className="text-xs text-stone-500">无界玳弦</p><p className="mt-1 text-2xl font-semibold text-white">{formatNumber(boundaryPosition.previous['无界玳弦'], 4)}</p></div><div className="text-right"><p className="text-xs text-stone-500">公共 CD</p><p className="mt-1 text-2xl font-semibold text-white">{formatNumber(boundaryPosition.previous['无界公共CD'], 4)}</p></div></div>
          </div>
        </article>
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_380px]">
        <article className="card overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4"><p className="text-sm font-semibold text-white">常规加速明细</p></div>
          <div className="max-h-[680px] overflow-auto scrollbar"><table className="w-full min-w-[920px]"><thead className="table-head"><tr>{headers.map((header) => <th className="px-4 py-3 text-right" key={header}>{header}</th>)}</tr></thead><tbody>{workbookData.haste.regular.map((row) => <tr className={`border-t border-white/[0.06] ${row['加速阈值'] === regularPosition.previous['加速阈值'] ? 'bg-rose-400/[0.06]' : ''}`} key={row['加速阈值']}>{headers.map((header) => <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-stone-500" key={header}>{formatNumber(row[header], header === '加速阈值' ? 0 : 4)}</td>)}</tr>)}</tbody></table></div>
        </article>
        <article className="card overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4"><p className="text-sm font-semibold text-white">无界档位表</p></div>
          <div className="max-h-[680px] overflow-auto scrollbar"><table className="w-full"><thead className="table-head"><tr><th className="px-4 py-3 text-right">无界玳弦</th><th className="px-4 py-3 text-right">公共 CD</th><th className="px-4 py-3 text-right">阈值</th></tr></thead><tbody>{workbookData.haste.boundary.map((row) => <tr className="border-t border-white/[0.06]" key={row['无界阈值']}><td className="px-4 py-3 text-right font-mono text-xs text-stone-400">{formatNumber(row['无界玳弦'], 4)}</td><td className="px-4 py-3 text-right font-mono text-xs text-stone-400">{formatNumber(row['无界公共CD'], 4)}</td><td className="px-4 py-3 text-right font-mono text-xs text-violet-300">{formatNumber(row['无界阈值'])}</td></tr>)}</tbody></table></div>
        </article>
      </div>
    </section>
  );
}
