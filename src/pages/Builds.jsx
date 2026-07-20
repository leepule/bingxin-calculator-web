import { useState } from 'react';
import { workbookData } from '../workbook-data.js';
import { formatCompact, formatNumber, formatPercent, formatStat } from '../lib/format.js';
import { Metric, SectionTitle } from '../components/ui.jsx';

export default function Builds() {
  const [buildIndex, setBuildIndex] = useState(0);
  const selectedBuild = workbookData.builds[buildIndex];
  const bestDps = Math.max(...workbookData.builds.map((build) => build.dps || 0));

  return (
    <section>
      <SectionTitle eyebrow="Loadouts" title="配装方案" description="对比工作簿“我的装备”中的四套完整配置" />
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {workbookData.builds.map((build, index) => (
          <button
            type="button"
            key={build.id}
            onClick={() => setBuildIndex(index)}
            className={`rounded-xl border px-4 py-3 text-left transition ${index === buildIndex ? 'border-rose-400/30 bg-rose-400/10' : 'border-white/[0.07] bg-black/10'}`}
          >
            <span className={`block text-sm font-medium ${index === buildIndex ? 'text-rose-300' : 'text-stone-300'}`}>{build.name}</span>
            <span className="mt-1 block text-xs text-stone-600">{formatCompact(build.dps)}</span>
          </button>
        ))}
      </div>

      <div className="mt-5 grid gap-5 xl:grid-cols-[.72fr_1.28fr]">
        <div className="space-y-5">
          <article className="card overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-4"><p className="text-sm font-semibold text-white">方案横向对比</p></div>
            <div className="overflow-x-auto scrollbar">
              <table className="w-full min-w-[520px] text-sm">
                <thead className="table-head"><tr><th className="px-4 py-3">方案</th><th className="px-4 py-3 text-right">装分</th><th className="px-4 py-3 text-right">DPS</th><th className="px-4 py-3 text-right">距最高</th></tr></thead>
                <tbody>{workbookData.builds.map((build, index) => (
                  <tr className={`border-t border-white/[0.06] ${index === buildIndex ? 'bg-rose-400/[0.04]' : ''}`} key={build.id}>
                    <td className="px-4 py-3 text-stone-300">{build.name}</td>
                    <td className="px-4 py-3 text-right font-mono text-stone-400">{formatNumber(build.stats['装备分数'])}</td>
                    <td className="px-4 py-3 text-right font-mono text-stone-300">{formatCompact(build.dps)}</td>
                    <td className="px-4 py-3 text-right font-mono text-stone-500">{formatPercent((build.dps || 0) / bestDps - 1, 2, true)}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </article>
          <article className="card p-5">
            <div className="flex items-end justify-between gap-4">
              <div><p className="metric-label">{selectedBuild.name} · DPS 参考</p><p className="mt-2 text-3xl font-semibold text-white">{formatCompact(selectedBuild.dps)}</p></div>
              <div className="text-right"><p className="metric-label">装备分数</p><p className="mt-2 text-xl font-semibold text-rose-300">{formatNumber(selectedBuild.stats['装备分数'])}</p></div>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-3">
              {Object.entries(selectedBuild.stats).filter(([label]) => label !== '装备分数').map(([label, stat]) => <Metric key={label} label={label} value={formatStat(label, stat)} />)}
            </div>
          </article>
        </div>

        <article className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <div><p className="text-sm font-semibold text-white">{selectedBuild.name} 装备清单</p><p className="mt-1 text-xs text-stone-600">{selectedBuild.equipment.length} 个部位</p></div>
            <span className="chip">精炼 / 附魔 / 镶嵌</span>
          </div>
          <div className="max-h-[720px] overflow-auto scrollbar">
            <table className="w-full min-w-[720px]"><thead className="table-head"><tr><th className="px-4 py-3">部位</th><th className="px-4 py-3">装备</th><th className="px-4 py-3">细节</th></tr></thead>
              <tbody>{selectedBuild.equipment.map((equipment, index) => (
                <tr className="border-t border-white/[0.06]" key={`${equipment.slot}-${index}`}>
                  <td className="px-4 py-3 text-xs font-semibold text-rose-300">{equipment.slot}</td>
                  <td className="px-4 py-3 text-sm text-stone-300">{equipment.item}</td>
                  <td className="px-4 py-3"><div className="flex flex-wrap gap-1.5">{equipment.details.map((detail, detailIndex) => <span className="chip !px-2 !py-1" key={`${String(detail)}-${detailIndex}`}>{detail}</span>)}</div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </article>
      </div>
    </section>
  );
}
