import { useMemo, useState } from 'react';
import { workbookData } from '../workbook-data.js';
import { formatNumber } from '../lib/format.js';
import { Dropdown, SectionTitle } from '../components/ui.jsx';

const pageSize = 18;

export default function Equipment() {
  const [query, setQuery] = useState('');
  const [slot, setSlot] = useState('全部');
  const [level, setLevel] = useState('全部');
  const [page, setPage] = useState(1);
  const slots = useMemo(() => [...new Set(workbookData.equipmentCatalog.map((equipment) => equipment.slot))].sort((left, right) => left.localeCompare(right, 'zh-CN')), []);
  const levels = useMemo(() => [...new Set(workbookData.equipmentCatalog.map((equipment) => equipment.itemLevel))].sort((left, right) => right - left), []);
  const filteredEquipment = useMemo(() => workbookData.equipmentCatalog.filter((equipment) => {
    const normalizedQuery = query.trim().toLowerCase();
    const searchableValues = [equipment.name, equipment.slot, equipment.type, equipment.template, equipment.setBonus, ...Object.keys(equipment.attributes)];
    const matchesQuery = !normalizedQuery || searchableValues.filter(Boolean).some((searchableValue) => String(searchableValue).toLowerCase().includes(normalizedQuery));
    return matchesQuery && (slot === '全部' || equipment.slot === slot) && (level === '全部' || String(equipment.itemLevel) === level);
  }), [query, slot, level]);
  const totalPages = Math.max(1, Math.ceil(filteredEquipment.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageEquipment = filteredEquipment.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function resetPage(setFilter) {
    setFilter();
    setPage(1);
  }

  return (
    <section>
      <SectionTitle eyebrow="Equipment Database" title="装备库" description={`来自 Excel装备 工作表，共 ${workbookData.equipmentCatalog.length} 件可用数据`} />
      <div className="card p-4">
        <div className="grid gap-3 lg:grid-cols-[1fr_220px_180px_auto]">
          <input className="soft-input" type="search" value={query} onChange={(event) => resetPage(() => setQuery(event.target.value))} placeholder="搜索装备名、属性、模板…" />
          <Dropdown value={slot} options={['全部', ...slots]} onChange={(event) => resetPage(() => setSlot(event.target.value))} />
          <Dropdown value={level} options={['全部', ...levels]} onChange={(event) => resetPage(() => setLevel(event.target.value))} />
          <div className="flex items-center justify-end px-2 text-xs text-stone-500">找到 <span className="mx-1 font-semibold text-rose-300">{filteredEquipment.length}</span> 件</div>
        </div>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {pageEquipment.map((equipment, index) => (
          <article className="card flex min-h-56 flex-col p-5 transition hover:-translate-y-0.5 hover:border-rose-400/20" key={`${equipment.slot}-${equipment.name}-${equipment.template}-${index}`}>
            <div className="flex items-start justify-between gap-4"><span className="chip text-rose-300">{equipment.slot}</span><span className="font-mono text-xs text-stone-600">{formatNumber(equipment.itemLevel)}</span></div>
            <h3 className="mt-4 text-sm font-semibold leading-6 text-white">{equipment.name}</h3>
            <p className="mt-1 text-xs text-stone-600">{equipment.type} · {equipment.template}</p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {Object.entries(equipment.attributes).map(([attributeName, amount]) => <span className="chip" key={attributeName}><span className="mr-1 text-stone-600">{attributeName}</span>{formatNumber(amount)}</span>)}
            </div>
            <div className="mt-auto flex items-end justify-between gap-4 pt-5 text-xs text-stone-600"><span className="truncate">{equipment.setBonus && equipment.setBonus !== '无' ? equipment.setBonus : '无套装效果'}</span><span>精炼 {formatNumber(equipment.refineLevel)}</span></div>
          </article>
        ))}
      </div>

      <div className="mt-5 flex items-center justify-between gap-4">
        <p className="text-xs text-stone-600">第 {currentPage} / {totalPages} 页</p>
        <div className="flex gap-2">
          <button className="nav-button border-white/10 disabled:opacity-30" type="button" disabled={currentPage <= 1} onClick={() => setPage(currentPage - 1)}>上一页</button>
          <button className="nav-button border-white/10 disabled:opacity-30" type="button" disabled={currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>下一页</button>
        </div>
      </div>
    </section>
  );
}
