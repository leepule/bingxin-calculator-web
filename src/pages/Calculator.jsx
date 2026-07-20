import { useEffect, useMemo, useRef, useState } from 'react';
import { calculatorEngine } from '../calculator-runtime.js';
import { workbookData } from '../workbook-data.js';
import { formatCompact, formatNumber, formatPercent } from '../lib/format.js';
import { Dropdown, Metric, SectionTitle, SelectCard } from '../components/ui.jsx';

const storageKey = 'bingxin-custom-loadouts-v1';
const readOnlyPresetMessage = '该工作簿预设缺少完整输入上下文，只能查看缓存结果。请先切回当前基准。';
const calculationDelayMs = 80;

function readSchemes() {
  const storedSchemes = localStorage.getItem(storageKey);
  if (!storedSchemes) return [];
  try {
    const parsedSchemes = JSON.parse(storedSchemes);
    return Array.isArray(parsedSchemes) ? parsedSchemes : [];
  } catch (parseError) {
    if (!(parseError instanceof SyntaxError)) throw parseError;
    localStorage.removeItem(storageKey);
    return [];
  }
}

function EnhancementSelect({ field, value, onChange, disabled }) {
  return (
    <SelectCard
      label={field.label}
      value={value}
      options={field.options}
      onChange={(event) => onChange(field, event.target.value)}
      disabled={disabled}
    />
  );
}

function PresetButtons({ onApply }) {
  return (
    <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
      <button type="button" className="nav-button border-rose-400/20 bg-rose-400/[0.06]" onClick={() => onApply('baseline')}>当前基准</button>
      {workbookData.builds.map((build, index) => (
        <button type="button" className="nav-button border-white/10" key={build.id} onClick={() => onApply(index)}>{build.name} · {formatCompact(build.dps)}</button>
      ))}
    </div>
  );
}

function EquipmentInput({ selection, disabled, isCalculating, onEquipmentChange, onRecalculate }) {
  return (
    <article className="card p-5 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="eyebrow">Equipment Input</p><h3 className="mt-1 text-lg font-semibold text-white">十二部位配装</h3></div>
        <button type="button" disabled={disabled || isCalculating} className="rounded-full border border-rose-400/30 bg-rose-400/10 px-4 py-2 text-xs font-medium text-rose-300 disabled:cursor-not-allowed disabled:opacity-40" onClick={onRecalculate}>{isCalculating ? '计算中…' : '重新计算'}</button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-2">
        {calculatorEngine.slotLayout.map((slotDefinition) => {
          const equipmentOptions = calculatorEngine.catalogBySlot.get(slotDefinition.catalogSlot) || [];
          return <SelectCard key={slotDefinition.key} label={slotDefinition.label} value={selection[slotDefinition.key]} options={equipmentOptions.map((equipment) => ({ value: equipment.name, label: `${equipment.name} · ${formatNumber(equipment.itemLevel)}` }))} onChange={(event) => onEquipmentChange(slotDefinition.key, event.target.value)} disabled={disabled} />;
        })}
      </div>
    </article>
  );
}

function resultStatus(calculation, isCalculating) {
  if (isCalculating) return ['重算状态', '等待新结果'];
  if (!calculation.canCustomize) return ['重算状态', '只读锁定'];
  return ['计算后加速', formatNumber(calculation.selectedHaste)];
}

function ResultSummary({ calculation, formulaStats, isCalculating }) {
  const [statusLabel, statusValue] = resultStatus(calculation, isCalculating);
  return (
    <>
      <article className="card relative overflow-hidden p-6" aria-busy={isCalculating}>
        <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 translate-x-16 -translate-y-20 rounded-full bg-rose-400/15 blur-[70px]" />
        <div className="relative">
          <div className="flex items-center justify-between gap-3"><p className="eyebrow">Result</p><span className="chip text-violet-300" role="status">{isCalculating ? '计算中…' : calculation.source}</span></div>
          <p className="mt-4 text-sm text-stone-500">预计副本 DPS</p>
          <p className="mt-1 text-4xl font-semibold tracking-[-0.05em] text-white">{formatCompact(calculation.dps)}</p>
          <div className="mt-5 grid grid-cols-2 gap-3"><Metric label="相对基准" value={formatPercent(calculation.change, 2, true)} /><Metric label={statusLabel} value={statusValue} /></div>
        </div>
      </article>
      {!isCalculating && calculation.canCustomize && <article className="card p-5"><p className="text-sm font-semibold text-white">完整公式输出</p><div className="mt-4 grid grid-cols-2 gap-3">{formulaStats.map(([label, value]) => <Metric key={label} label={label} value={value} />)}</div></article>}
    </>
  );
}

function SavedSchemes({ schemeName, savedSchemes, onNameChange, onSave, onLoad, onDelete }) {
  return (
    <article className="card p-5">
      <p className="text-sm font-semibold text-white">保存自定义方案</p>
      <div className="mt-3 flex gap-2"><input className="soft-input" value={schemeName} onChange={(event) => onNameChange(event.target.value)} placeholder="输入方案名称" /><button type="button" className="shrink-0 rounded-xl bg-rose-400 px-4 text-sm font-medium text-ink" onClick={onSave}>保存</button></div>
      <div className="mt-4 space-y-2">
        {savedSchemes.length === 0 && <p className="text-xs text-stone-600">暂无浏览器本地方案。</p>}
        {savedSchemes.map((savedScheme, index) => (
          <div className="flex items-center gap-2 rounded-xl border border-white/[0.07] bg-black/10 p-2" key={`${savedScheme.name}-${savedScheme.savedAt}`}>
            <button type="button" className="min-w-0 flex-1 truncate px-2 py-1 text-left text-xs text-stone-300" onClick={() => onLoad(savedScheme)}>{savedScheme.name}</button>
            <button type="button" className="px-2 py-1 text-xs text-stone-600 hover:text-rose-300" onClick={() => onDelete(index)}>删除</button>
          </div>
        ))}
      </div>
    </article>
  );
}

function EnhancementSettings({ fieldsBySection, customization, onChange, disabled }) {
  const selects = (section) => fieldsBySection[section].map((field) => <EnhancementSelect key={field.key} field={field} value={customization[field.key]} onChange={onChange} disabled={disabled} />);
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
      <article className="card p-5 sm:p-6">
        <p className="eyebrow">Enchantments</p><h3 className="mt-1 text-lg font-semibold text-white">大小附魔</h3><p className="mt-2 text-xs leading-5 text-stone-600">每个选项均写入工作簿原始输入单元格并自动重算。</p>
        <p className="mb-3 mt-5 text-xs font-semibold text-stone-400">小附魔</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{selects('大附魔')}</div>
        <div className="mt-6 border-t border-white/[0.06] pt-5"><p className="mb-3 text-xs font-semibold text-stone-400">大附魔</p><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{selects('小附魔')}</div></div>
      </article>
      <article className="card p-5 sm:p-6"><p className="eyebrow">Sockets</p><h3 className="mt-1 text-lg font-semibold text-white">镶嵌与精炼</h3><p className="mt-2 text-xs leading-5 text-stone-600">五彩石属性二、三会根据前置属性按工作簿公式联动。</p><div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">{selects('镶嵌')}</div></article>
    </div>
  );
}

function SelectionDetails({ calculation, selection }) {
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[.78fr_1.22fr]">
      <article className="card p-6">
        <SectionTitle eyebrow="Attribute Delta" title="相对基准属性变化" description="仅展示装备本体差值；附魔与镶嵌影响已计入完整公式输出" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Object.entries(calculation.attributeDelta).map(([attributeName, difference]) => <div className="rounded-xl border border-white/[0.07] bg-black/10 p-3" key={attributeName}><p className="metric-label">{attributeName}</p><p className={`mt-2 font-mono text-lg font-semibold ${difference > 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{difference > 0 ? '+' : ''}{formatNumber(difference)}</p></div>)}
          {Object.keys(calculation.attributeDelta).length === 0 && <p className="col-span-full text-sm text-stone-600">当前装备与基准配装一致。</p>}
        </div>
      </article>
      <article className="card overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-4"><p className="text-sm font-semibold text-white">当前配装明细</p></div>
        <div className="max-h-[560px] overflow-auto scrollbar"><table className="w-full min-w-[720px]"><thead className="table-head"><tr><th className="px-4 py-3">部位</th><th className="px-4 py-3">装备</th><th className="px-4 py-3">属性</th></tr></thead><tbody>{calculatorEngine.slotLayout.map((slotDefinition) => {
          const equipment = calculatorEngine.equipmentByName.get(selection[slotDefinition.key]);
          const attributes = equipment ? Object.entries(equipment.attributes).map(([name, amount]) => `${name} ${formatNumber(amount)}`).join(' · ') : '工作簿已保存装备';
          return <tr className="border-t border-white/[0.06]" key={slotDefinition.key}><td className="px-4 py-3 text-xs font-semibold text-rose-300">{slotDefinition.label}</td><td className="px-4 py-3 text-sm text-stone-300">{selection[slotDefinition.key]}</td><td className="px-4 py-3 text-xs text-stone-600">{attributes}</td></tr>;
        })}</tbody></table></div>
      </article>
    </div>
  );
}

function RecommendationTable({ recommendationSlot, recommendations, calculation, onSlotChange, onApply }) {
  return (
    <article className="card mt-5 overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-white/[0.06] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-sm font-semibold text-white">替换装备推荐</p><p className="mt-1 text-xs text-stone-600">快速排序候选；采用后执行完整公式重算</p></div>
        <div className="min-w-40"><Dropdown value={recommendationSlot} options={calculatorEngine.slotLayout.map((slotDefinition) => ({ value: slotDefinition.key, label: slotDefinition.label }))} onChange={(event) => onSlotChange(event.target.value)} /></div>
      </div>
      <div className="max-h-[620px] overflow-auto scrollbar"><table className="w-full min-w-[720px]"><thead className="table-head"><tr><th className="px-4 py-3">排名</th><th className="px-4 py-3">候选装备</th><th className="px-4 py-3 text-right">替换收益</th><th /></tr></thead><tbody>{recommendations.map((recommendation, index) => {
        const relativeChange = recommendation.calculation.dps / calculation.dps - 1;
        return <tr className="border-t border-white/[0.06]" key={recommendation.equipment.name}><td className="px-4 py-3 font-mono text-xs text-stone-600">{index + 1}</td><td className="px-4 py-3 text-sm text-stone-300">{recommendation.equipment.name}</td><td className="px-4 py-3 text-right font-mono text-xs text-stone-500">{formatPercent(relativeChange, 2, true)}</td><td className="px-4 py-3 text-right"><button type="button" className="text-xs font-medium text-rose-300" onClick={() => onApply(recommendation.equipment.name)}>采用</button></td></tr>;
      })}</tbody></table></div>
    </article>
  );
}

export default function Calculator() {
  const [selection, setSelection] = useState(() => ({ ...calculatorEngine.baselineSelection }));
  const [customization, setCustomization] = useState(() => ({ ...calculatorEngine.baselineCustomization }));
  const [calculation, setCalculation] = useState(null);
  const [calculationRevision, setCalculationRevision] = useState(0);
  const [isCalculating, setIsCalculating] = useState(true);
  const [isInputLocked, setIsInputLocked] = useState(true);
  const [calculationError, setCalculationError] = useState('');
  const [recommendationSlot, setRecommendationSlot] = useState('裤子');
  const [message, setMessage] = useState('');
  const [schemeName, setSchemeName] = useState('');
  const [savedSchemes, setSavedSchemes] = useState(readSchemes);
  const workerRef = useRef(null);
  const latestRequestId = useRef(0);

  useEffect(() => {
    const worker = new Worker(new URL('../engine/calculator-worker.mjs', import.meta.url), { type: 'module' });
    workerRef.current = worker;
    worker.onmessage = ({ data }) => {
      if (data.requestId !== latestRequestId.current) return;
      if (data.error) {
        setCalculationError(data.error);
        setIsCalculating(false);
        setIsInputLocked(true);
        return;
      }
      setCalculation(data.calculation);
      setCalculationError('');
      setIsCalculating(false);
      setIsInputLocked(false);
      setMessage((currentMessage) => currentMessage
        ? `重算完成：${formatCompact(data.calculation.dps)}（${data.calculation.source}）`
        : currentMessage);
    };
    worker.onerror = () => {
      setCalculationError('公式计算线程启动失败，请刷新页面重试。');
      setIsCalculating(false);
      setIsInputLocked(true);
    };
    return () => worker.terminate();
  }, []);

  useEffect(() => {
    const requestId = latestRequestId.current + 1;
    latestRequestId.current = requestId;
    const timeoutId = window.setTimeout(() => {
      workerRef.current?.postMessage({ requestId, selection, customization });
    }, calculationDelayMs);
    return () => window.clearTimeout(timeoutId);
  }, [selection, customization, calculationRevision]);

  const customizationFields = useMemo(
    () => calculatorEngine.customizationFieldsFor(customization),
    [customization],
  );
  const recommendations = useMemo(
    () => calculation && !isCalculating && calculation.canCustomize
      ? calculatorEngine.recommendations(recommendationSlot, selection, customization).slice(0, 12)
      : [],
    [calculation, isCalculating, recommendationSlot, selection, customization],
  );

  function startEditableCalculation() {
    setCalculationError('');
    setIsCalculating(true);
    setIsInputLocked(false);
  }

  function startLockedCalculation() {
    setCalculationError('');
    setIsCalculating(true);
    setIsInputLocked(true);
  }

  function applyPreset(presetIndex) {
    startLockedCalculation();
    if (presetIndex === 'baseline') {
      setSelection({ ...calculatorEngine.baselineSelection });
      setCustomization({ ...calculatorEngine.baselineCustomization });
      setMessage('正在读取当前基准配装。');
      return;
    }
    setSelection({ ...calculatorEngine.buildSelections[presetIndex] });
    setCustomization(calculatorEngine.compatibleCustomization(calculatorEngine.buildCustomizations[presetIndex]));
    setMessage(`正在读取装备 ${presetIndex + 1}。`);
  }

  function updateEquipment(slotKey, equipmentName) {
    if (!calculation.canCustomize || isInputLocked) {
      setMessage(readOnlyPresetMessage);
      return;
    }
    startEditableCalculation();
    setSelection((currentSelection) => ({ ...currentSelection, [slotKey]: equipmentName }));
    setMessage('装备已变更，正在等待完整公式重算。');
  }

  function updateEnhancement(field, rawValue) {
    if (!calculation.canCustomize || isInputLocked) {
      setMessage(readOnlyPresetMessage);
      return;
    }
    startEditableCalculation();
    const fieldValue = field.valueType === 'number' ? Number(rawValue) : rawValue;
    setCustomization((currentCustomization) => calculatorEngine.compatibleCustomization({
      ...currentCustomization,
      [field.key]: fieldValue,
    }));
    setMessage('附魔或镶嵌已变更，正在等待完整公式重算。');
  }

  function persistSchemes(nextSchemes) {
    setSavedSchemes(nextSchemes);
    localStorage.setItem(storageKey, JSON.stringify(nextSchemes));
  }

  function saveScheme() {
    const resolvedName = schemeName.trim() || `自定义方案 ${savedSchemes.length + 1}`;
    const savedScheme = {
      name: resolvedName,
      selection: { ...selection },
      customization: { ...customization },
      savedAt: new Date().toISOString(),
    };
    const existingIndex = savedSchemes.findIndex((scheme) => scheme.name === resolvedName);
    const nextSchemes = [...savedSchemes];
    if (existingIndex >= 0) nextSchemes[existingIndex] = savedScheme;
    else nextSchemes.push(savedScheme);
    persistSchemes(nextSchemes);
    setSchemeName('');
    setMessage(`已保存“${resolvedName}”。`);
  }

  function loadScheme(savedScheme) {
    startLockedCalculation();
    setSelection({ ...savedScheme.selection });
    setCustomization(calculatorEngine.compatibleCustomization({
      ...calculatorEngine.baselineCustomization,
      ...savedScheme.customization,
    }));
    setMessage(`正在读取“${savedScheme.name}”。`);
  }

  function deleteScheme(schemeIndex) {
    const deletedScheme = savedSchemes[schemeIndex];
    persistSchemes(savedSchemes.filter((_, index) => index !== schemeIndex));
    setMessage(`已删除“${deletedScheme.name}”。`);
  }

  function recalculate() {
    startEditableCalculation();
    setCalculationRevision((currentRevision) => currentRevision + 1);
  }

  if (!calculation) {
    return (
      <section>
        <SectionTitle eyebrow="Web Recalculation" title="自定义配装计算" description="正在准备完整公式运行时" />
        <div className={`card p-6 text-sm ${calculationError ? 'text-rose-300' : 'text-stone-500'}`} aria-busy={!calculationError}>{calculationError || '首次公式计算中，请稍候…'}</div>
      </section>
    );
  }

  const controlsDisabled = isInputLocked || !calculation.canCustomize;

  const fieldsBySection = Object.fromEntries(['大附魔', '小附魔', '镶嵌'].map((section) => [
    section,
    customizationFields.filter((field) => field.section === section),
  ]));
  const formulaOutputs = calculation.outputs || {};
  const formulaStats = [
    ['装分', formulaOutputs.score],
    ['根骨', formatNumber(formulaOutputs.spirit)],
    ['基础攻击', formatNumber(formulaOutputs.attack)],
    ['会心', formatPercent(formulaOutputs.critical)],
    ['会心效果', formatPercent(formulaOutputs.criticalEffect)],
    ['破防', formatPercent(formulaOutputs.overcome)],
    ['无双', formatPercent(formulaOutputs.strain)],
    ['破招', formatNumber(formulaOutputs.surplus)],
  ];

  return (
    <section>
      <SectionTitle eyebrow="Web Recalculation" title="自定义配装计算" description="当前基准支持完整重算；缺少完整输入上下文的工作簿预设会自动切换为只读" />
      <PresetButtons onApply={applyPreset} />
      {message && <div className="mb-5 rounded-xl border border-emerald-300/15 bg-emerald-300/[0.05] px-4 py-3 text-sm text-emerald-200/80">{message}</div>}
      {calculationError && <div className="mb-5 rounded-xl border border-rose-300/20 bg-rose-300/[0.07] px-4 py-3 text-sm text-rose-200">{calculationError}</div>}
      {!isCalculating && !calculation.canCustomize && <div className="mb-5 rounded-xl border border-amber-300/20 bg-amber-300/[0.07] px-4 py-3 text-sm leading-6 text-amber-100/80">该工作簿预设仅保留了缓存 DPS，缺少完整输入上下文，已锁定装备、附魔和推荐修改。当前公式上下文重算为 {formatCompact(calculation.formulaDps)}，与缓存值偏差 {calculation.cacheDifference === null ? '不可比较' : formatPercent(calculation.cacheDifference)}；请切回“当前基准”后再进行自定义计算。</div>}
      <div className="grid gap-5 xl:grid-cols-[1.22fr_.78fr]">
        <EquipmentInput selection={selection} disabled={controlsDisabled} isCalculating={isCalculating} onEquipmentChange={updateEquipment} onRecalculate={recalculate} />
        <div className="space-y-5">
          <ResultSummary calculation={calculation} formulaStats={formulaStats} isCalculating={isCalculating} />
          <SavedSchemes schemeName={schemeName} savedSchemes={savedSchemes} onNameChange={setSchemeName} onSave={saveScheme} onLoad={loadScheme} onDelete={deleteScheme} />
        </div>
      </div>
      <EnhancementSettings fieldsBySection={fieldsBySection} customization={customization} onChange={updateEnhancement} disabled={controlsDisabled} />
      {!isCalculating && <SelectionDetails calculation={calculation} selection={selection} />}
      {!isCalculating && calculation.canCustomize && <RecommendationTable recommendationSlot={recommendationSlot} recommendations={recommendations} calculation={calculation} onSlotChange={setRecommendationSlot} onApply={(equipmentName) => updateEquipment(recommendationSlot, equipmentName)} />}
    </section>
  );
}
