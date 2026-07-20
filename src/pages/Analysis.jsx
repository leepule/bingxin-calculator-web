import { workbookData } from '../workbook-data.js';
import { formatNumber, formatPercent } from '../lib/format.js';
import { SectionTitle } from '../components/ui.jsx';

export default function Analysis() {
  const statMaximum = Math.max(...workbookData.analysis.statReturns.map((statReturn) => statReturn.value));
  const arrayMaximum = Math.max(...workbookData.analysis.arrays.map((arrayReturn) => arrayReturn.value));

  return (
    <section>
      <SectionTitle eyebrow="Value Analysis" title="收益分析" description="当前配装下的属性单位收益、阵眼收益与裤子替换排名" />
      <div className="grid gap-5 xl:grid-cols-2">
        <article className="card p-6">
          <SectionTitle eyebrow="Stat Return" title="属性单位收益" description="右侧为工作簿中用于对比的属性增量" />
          <div className="space-y-5">{workbookData.analysis.statReturns.map((statReturn) => (
            <div className="grid grid-cols-[74px_1fr_auto] items-center gap-3" key={statReturn.name}>
              <span className="text-sm text-stone-300">{statReturn.name}</span>
              <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-rose-400" style={{ width: `${statReturn.value / statMaximum * 100}%` }} /></div>
              <div className="min-w-24 text-right"><span className="font-mono text-xs text-white">{formatPercent(statReturn.value)}</span><span className="ml-2 text-[10px] text-stone-600">/{formatNumber(statReturn.unit)}</span></div>
            </div>
          ))}</div>
        </article>
        <article className="card p-6">
          <SectionTitle eyebrow="Formation" title="阵眼收益" description="相对“无阵眼”的伤害增幅" />
          <div className="space-y-4">{workbookData.analysis.arrays.map((arrayReturn) => (
            <div className="grid grid-cols-[86px_1fr_auto] items-center gap-3" key={arrayReturn.name}>
              <span className="truncate text-sm text-stone-300">{arrayReturn.name}</span>
              <div className="h-2 overflow-hidden rounded-full bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-violet-400 to-rose-400" style={{ width: `${arrayReturn.value / arrayMaximum * 100}%` }} /></div>
              <span className="w-16 text-right font-mono text-xs text-stone-500">{formatPercent(arrayReturn.value)}</span>
            </div>
          ))}</div>
        </article>
      </div>

      <article className="card mt-5 overflow-hidden">
        <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4"><div><p className="text-sm font-semibold text-white">{workbookData.recommendations.slot}推荐排名</p><p className="mt-1 text-xs text-stone-600">相对当前第一名的伤害变化</p></div><span className="chip">{workbookData.recommendations.items.length} 个候选</span></div>
        <div className="max-h-[620px] overflow-auto scrollbar">
          <table className="w-full min-w-[620px]"><thead className="table-head"><tr><th className="px-4 py-3">排名</th><th className="px-4 py-3">装备</th><th className="px-4 py-3 text-right">伤害变化</th></tr></thead>
            <tbody>{workbookData.recommendations.items.map((recommendation, index) => <tr className="border-t border-white/[0.06]" key={recommendation.name}><td className="px-4 py-3 font-mono text-xs text-stone-600">{String(index + 1).padStart(2, '0')}</td><td className="px-4 py-3 text-sm text-stone-300">{recommendation.name}</td><td className="px-4 py-3 text-right font-mono text-xs text-stone-500">{recommendation.value === 0 ? '基准' : formatPercent(recommendation.value, 2, true)}</td></tr>)}</tbody>
          </table>
        </div>
      </article>

      <details className="card mt-5 overflow-hidden">
        <summary className="cursor-pointer px-5 py-4 text-sm font-semibold text-white">查看 {workbookData.skillCoefficients.length} 条技能系数数据</summary>
        <div className="max-h-[560px] overflow-auto border-t border-white/[0.06] scrollbar">
          <table className="w-full min-w-[640px]"><thead className="table-head"><tr><th className="px-4 py-3">技能</th><th className="px-4 py-3 text-right">基础伤害</th><th className="px-4 py-3 text-right">技能系数</th><th className="px-4 py-3 text-right">破招系数</th></tr></thead>
            <tbody>{workbookData.skillCoefficients.map((skill) => <tr className="border-t border-white/[0.06]" key={skill.name}><td className="px-4 py-3 text-sm text-stone-300">{skill.name}</td><td className="px-4 py-3 text-right font-mono text-xs text-stone-500">{skill.baseDamage}</td><td className="px-4 py-3 text-right font-mono text-xs text-stone-500">{formatNumber(skill.coefficient, 4)}</td><td className="px-4 py-3 text-right font-mono text-xs text-stone-500">{formatNumber(skill.surplusCoefficient, 4)}</td></tr>)}</tbody>
          </table>
        </div>
      </details>
    </section>
  );
}
