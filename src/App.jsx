import { useEffect, useState } from 'react';
import { workbookData } from './legacy.js';
import Overview from './pages/Overview.jsx';
import Calculator from './pages/Calculator.jsx';
import Builds from './pages/Builds.jsx';
import Equipment from './pages/Equipment.jsx';
import Analysis from './pages/Analysis.jsx';
import Haste from './pages/Haste.jsx';
import Workbook from './pages/Workbook.jsx';

const tabs = [
  ['overview', '总览'],
  ['calculator', '自定义计算'],
  ['builds', '配装方案'],
  ['equipment', '装备库'],
  ['analysis', '收益分析'],
  ['haste', '加速档位'],
  ['workbook', '工作簿分析'],
];

function initialTab() {
  const requestedTab = location.hash.slice(1);
  return tabs.some(([tab]) => tab === requestedTab) ? requestedTab : 'overview';
}

function initialTheme() {
  const savedTheme = localStorage.getItem('bingxin-theme');
  if (savedTheme === 'light' || savedTheme === 'dark') return savedTheme;
  return window.matchMedia?.('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
}

export default function App() {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [theme, setTheme] = useState(initialTheme);

  useEffect(() => {
    history.replaceState(null, '', `#${activeTab}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeTab]);

  useEffect(() => {
    document.documentElement.classList.toggle('light', theme === 'light');
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem('bingxin-theme', theme);
  }, [theme]);

  const pages = {
    overview: <Overview onNavigate={setActiveTab} />,
    calculator: <Calculator />,
    builds: <Builds />,
    equipment: <Equipment />,
    analysis: <Analysis />,
    haste: <Haste />,
    workbook: <Workbook />,
  };

  return (
    <>
      <div className="page-grid pointer-events-none fixed inset-0 opacity-70" />
      <div className="pointer-events-none fixed -left-40 -top-52 h-[540px] w-[540px] rounded-full bg-rose-500/10 blur-[120px]" />
      <div className="pointer-events-none fixed -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-violet-400/10 blur-[130px]" />

      <header className="relative border-b border-white/5">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-5 py-8 sm:px-8 lg:flex-row lg:items-end lg:justify-between lg:px-10">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="chip border-rose-400/20 bg-rose-400/10 text-rose-300">{workbookData.meta.version}</span>
              <span className="chip">{workbookData.equipmentCatalog.length} 件装备 · {workbookData.meta.updatedAt}</span>
              {workbookData.meta.reference && <a className="chip transition hover:border-rose-400/30 hover:text-rose-300" href={workbookData.meta.reference.url} target="_blank" rel="noreferrer">原始 Excel 参考页 ↗</a>}
            </div>
            <p className="eyebrow">JX3 · 冰心诀数据分析</p>
            <h1 className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white sm:text-4xl">
              暗影千机 <span className="font-light text-stone-500">数据看板</span>
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
              从 Excel 宏工作簿迁移数据与完整公式链，支持装备、附魔和镶嵌自定义计算。
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3 text-xs text-stone-500">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_16px_rgba(52,211,153,.7)]" />
            <span>已加载 {workbookData.meta.source}</span>
            <button type="button" className="nav-button border-white/10" onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')} aria-label={`切换到${theme === 'dark' ? '浅色' : '深色'}主题`}>
              <span aria-hidden="true">{theme === 'dark' ? '☀' : '☾'}</span>
              <span className="ml-1">{theme === 'dark' ? '浅色' : '深色'}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-[1500px] px-5 pb-16 sm:px-8 lg:px-10">
        <nav className="scrollbar sticky top-0 z-30 -mx-5 overflow-x-auto border-b border-white/5 bg-ink/90 px-5 py-4 backdrop-blur-xl sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
          <div className="flex min-w-max gap-1">
            {tabs.map(([tab, label]) => (
              <button
                key={tab}
                type="button"
                className={`nav-button ${activeTab === tab ? 'is-active' : ''}`}
                onClick={() => setActiveTab(tab)}
              >
                {label}
              </button>
            ))}
          </div>
        </nav>
        <div className="pt-7">{pages[activeTab]}</div>
      </main>

      <footer className="relative border-t border-white/5 px-5 py-8 text-center text-xs text-stone-600">
        React + Tailwind CSS · 数据与公式来源于本地 XLSM · 自定义配装由浏览器完整重算
        {workbookData.meta.reference && <> · <a className="transition hover:text-rose-300" href={workbookData.meta.reference.url} target="_blank" rel="noreferrer">JX3BOX 参考来源</a></>}
      </footer>
    </>
  );
}
