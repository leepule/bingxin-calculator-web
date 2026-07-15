import { workbookData } from '../legacy.js';
import { formatNumber } from '../lib/format.js';
import { Metric, SectionTitle } from '../components/ui.jsx';

export default function Workbook() {
  const primarySource = workbookData.meta.sourceComparison[0];
  const sheets = [...primarySource.sheets].sort((left, right) => right.formulas - left.formulas);
  const updateNotes = String(workbookData.meta.updateNotes || '').split('\n').map((line) => line.trim()).filter(Boolean);

  return (
    <section>
      <SectionTitle eyebrow="Workbook Audit" title="工作簿分析" description="识别宏、公式规模、可见页面与 Excel / WPS 文件差异" />
      <div className="grid gap-5 xl:grid-cols-2">
        {workbookData.meta.sourceComparison.map((source, index) => (
          <article className={`card p-5 ${index === 0 ? 'border-rose-400/20' : ''}`} key={source.file}>
            <div className="flex items-start justify-between gap-4"><div><p className="text-sm font-semibold text-white">{source.file}</p><p className="mt-1 text-xs text-stone-600">{index === 0 ? '网页数据源' : '对照文件'}</p></div><span className={`chip ${source.hasVba ? 'text-emerald-300' : ''}`}>{source.hasVba ? '含 VBA' : '无 VBA'}</span></div>
            <div className="mt-5 grid grid-cols-2 gap-3"><Metric label="工作表" value={formatNumber(source.sheetCount)} detail={`${source.visibleSheetCount} 个可见`} /><Metric label="命名区域" value={formatNumber(source.definedNameCount)} /><Metric label="公式" value={formatNumber(source.formulaCount)} /><Metric label="有效单元格" value={formatNumber(source.nonemptyCellCount)} /></div>
          </article>
        ))}
      </div>

      {workbookData.meta.reference && (
        <a className="card mt-5 flex items-center justify-between gap-5 p-5 transition hover:border-rose-400/30" href={workbookData.meta.reference.url} target="_blank" rel="noreferrer">
          <div><p className="eyebrow">Reference</p><h3 className="mt-1 text-base font-semibold text-white">{workbookData.meta.reference.title}</h3><p className="mt-2 text-xs text-stone-600">当前迁移使用的 Excel 工作簿参考来源</p></div>
          <span className="shrink-0 text-xl text-rose-300">↗</span>
        </a>
      )}

      <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
        <article className="card overflow-hidden">
          <div className="border-b border-white/[0.06] px-5 py-4"><p className="text-sm font-semibold text-white">工作表公式分布</p></div>
          <div className="max-h-[720px] overflow-auto scrollbar">
            <table className="w-full min-w-[720px]"><thead className="table-head"><tr><th className="px-4 py-3">工作表</th><th className="px-4 py-3">状态</th><th className="px-4 py-3 text-right">范围</th><th className="px-4 py-3 text-right">有效单元格</th><th className="px-4 py-3 text-right">公式</th></tr></thead>
              <tbody>{sheets.map((sheet) => <tr className="border-t border-white/[0.06]" key={sheet.name}><td className="px-4 py-3 text-sm text-stone-300">{sheet.name}</td><td className="px-4 py-3"><span className="chip !px-2 !py-1">{sheet.state === 'visible' ? '可见' : '隐藏'}</span></td><td className="px-4 py-3 text-right font-mono text-xs text-stone-500">{formatNumber(sheet.rows)} × {formatNumber(sheet.columns)}</td><td className="px-4 py-3 text-right font-mono text-xs text-stone-500">{formatNumber(sheet.nonempty)}</td><td className="px-4 py-3 text-right font-mono text-xs text-rose-300">{formatNumber(sheet.formulas)}</td></tr>)}</tbody>
            </table>
          </div>
        </article>
        <div className="space-y-5">
          <article className="card p-5"><p className="eyebrow">Formula Runtime</p><h3 className="mt-1 text-lg font-semibold text-white">网页公式链</h3><div className="mt-5 grid grid-cols-2 gap-3"><Metric label="公式锚点" value="4,273" /><Metric label="命名表达式" value="35" /><Metric label="工作表" value="34" /><Metric label="装备" value={formatNumber(workbookData.equipmentCatalog.length)} /></div></article>
          <article className="card p-5"><p className="text-sm font-semibold text-white">更新说明</p><div className="mt-4 space-y-2 text-xs leading-6 text-stone-500">{updateNotes.map((note) => <p key={note}>{note}</p>)}</div></article>
        </div>
      </div>
    </section>
  );
}
