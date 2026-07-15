import { workbookData } from '../legacy.js';
import { formatCompact, formatNumber, formatPercent, formatStat } from '../lib/format.js';
import { Metric, SectionTitle } from '../components/ui.jsx';

const palette = ['#e881b2', '#a98df5', '#68d5c4', '#f5bd72', '#7fb3ff', '#ec8b70', '#d9d26f'];

export default function Overview({ onNavigate }) {
  const { main, analysis, meta } = workbookData;
  const skillTotal = analysis.skills.reduce((total, skill) => total + skill.value, 0);

  return (
    <section>
      <div className="grid gap-5 xl:grid-cols-[1.35fr_.65fr]">
        <article className="card relative overflow-hidden p-6 sm:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-72 w-72 translate-x-20 -translate-y-24 rounded-full bg-rose-400/15 blur-[90px]" />
          <div className="relative flex h-full flex-col justify-between gap-10">
            <div>
              <p className="eyebrow">当前缓存结果</p>
              <div className="mt-3 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                <div>
                  <p className="text-sm text-stone-500">副本 DPS</p>
                  <p className="mt-1 text-5xl font-semibold tracking-[-0.06em] text-white sm:text-6xl">{formatCompact(main.mainDps)}</p>
                  <p className="mt-3 font-mono text-xs text-stone-600">{formatNumber(main.mainDps)} / {main.settings.循环}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:min-w-80">
                  <Metric label="装备分数" value={formatNumber(main.score)} />
                  <Metric label="角色" value={main.nickname || '未填写昵称'} />
                </div>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(main.settings).map(([label, setting]) => (
                <span className="chip" key={label}><span className="mr-1.5 text-stone-600">{label}</span>{setting}</span>
              ))}
            </div>
            <div className="flex flex-wrap gap-5">
              <button className="text-sm font-medium text-rose-300 hover:text-rose-200" type="button" onClick={() => onNavigate('calculator')}>自定义配装计算 →</button>
              <button className="text-sm font-medium text-stone-400 hover:text-white" type="button" onClick={() => onNavigate('builds')}>查看完整配装</button>
            </div>
          </div>
        </article>

        <article className="card p-6">
          <SectionTitle eyebrow="Damage Mix" title="伤害构成" description="按当前循环缓存值统计" />
          <div className="space-y-3">
            {analysis.skills.slice(0, 8).map((skill, index) => (
              <div className="grid grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2" key={skill.name}>
                <div className="flex min-w-0 items-center gap-2 text-sm">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: palette[index % palette.length] }} />
                  <span className="truncate text-stone-300">{skill.name}</span>
                </div>
                <span className="font-mono text-xs text-stone-500">{formatPercent(skill.value)}</span>
                <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-white/5">
                  <div className="h-full rounded-full bg-gradient-to-r from-rose-400 to-violet-400" style={{ width: `${Math.min(skill.value / analysis.skills[0].value * 100, 100)}%` }} />
                </div>
              </div>
            ))}
            <p className="pt-2 text-right text-xs text-stone-600">已统计 {formatPercent(skillTotal, 1)}</p>
          </div>
        </article>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
        {Object.entries(main.stats).map(([label, stat]) => <Metric key={label} label={label} value={formatStat(label, stat)} />)}
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <article className="card p-6">
          <SectionTitle eyebrow="Talent" title="奇穴方案" description="工作簿计算主页当前选择" />
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {main.talents.map((talent, index) => (
              <div className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-black/10 p-3" key={`${talent}-${index}`}>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-rose-400/10 text-xs font-semibold text-rose-300">{index + 1}</span>
                <span className="truncate text-sm text-stone-300">{talent}</span>
              </div>
            ))}
          </div>
        </article>
        <article className="card p-6">
          <SectionTitle eyebrow="Buffs" title="增益与消耗品" description="阵眼、团队增益和当前药食配置" />
          <div className="flex flex-wrap gap-2">{main.consumables.map((consumable, index) => <span className="chip text-violet-300" key={`${consumable}-${index}`}>{consumable}</span>)}</div>
          <div className="mt-6 rounded-xl border border-amber-300/10 bg-amber-300/[0.04] p-4 text-xs leading-6 text-amber-100/60">{meta.notice}</div>
        </article>
      </div>
    </section>
  );
}
