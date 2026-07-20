'use strict';

global.window = global;
require('../src/generated/data.js');
require('../src/generated/formula-model.js');
require('../src/engine/formula-runtime.js');
require('../src/engine/calculator.js');

const calculator = BingxinCalculator.createCalculator(APP_DATA);
const baseline = calculator.calculate({ ...calculator.baselineSelection });
const regressionWorkbook = new BingxinFormulaRuntime.FormulaWorkbook(BINGXIN_FORMULA_MODEL);
const expectedOutputs = {
  dps: APP_DATA.main.mainDps,
  score: `装分 ${APP_DATA.main.score}`,
  spirit: APP_DATA.main.stats['根骨'],
  attack: APP_DATA.main.stats['基础攻击'],
  critical: APP_DATA.main.stats['会心'],
  criticalEffect: APP_DATA.main.stats['会心效果'],
  haste: APP_DATA.main.stats['加速'],
  overcome: APP_DATA.main.stats['破防'],
  strain: APP_DATA.main.stats['无双'],
  surplus: APP_DATA.main.stats['破招'],
};

if (!baseline.canCustomize) {
  throw new Error('当前基准与公式重算一致时不应被锁定');
}

for (const [outputName, expectedValue] of Object.entries(expectedOutputs)) {
  const actualValue = baseline.outputs[outputName];
  if (typeof expectedValue === 'number') {
    const tolerance = Math.max(1, Math.abs(expectedValue)) * 1e-10;
    if (Math.abs(actualValue - expectedValue) > tolerance) {
      throw new Error(`${outputName} 回归失败：${actualValue} !== ${expectedValue}`);
    }
  } else if (actualValue !== expectedValue) {
    throw new Error(`${outputName} 回归失败：${actualValue} !== ${expectedValue}`);
  }
}

const replacement = APP_DATA.recommendations.items[1].name;
const customSelection = { ...calculator.baselineSelection, 裤子: replacement };
const customCalculation = calculator.calculate(customSelection);

if (customCalculation.source !== '完整公式重算') {
  throw new Error(`自定义配装未进入完整公式重算：${customCalculation.source}`);
}
if (!customCalculation.canCustomize) {
  throw new Error('自定义配装不应被只读锁定');
}
if (customCalculation.dps === baseline.dps) {
  throw new Error('替换装备后 DPS 没有变化');
}

const customEnhancements = {
  ...calculator.baselineCustomization,
  帽子大附魔: '攻击',
  帽子小附魔: '小伤帽',
  五彩石属性一: '会心',
  五彩石属性二: '破防',
  五彩石属性三: '攻击',
  装备孔: 7,
  精炼等级: 7,
};
const enhancementCalculation = calculator.calculate(calculator.baselineSelection, customEnhancements);
if (enhancementCalculation.source !== '完整公式重算') {
  throw new Error(`自定义附魔镶嵌未进入完整公式重算：${enhancementCalculation.source}`);
}
if (!enhancementCalculation.canCustomize) {
  throw new Error('自定义附魔镶嵌不应被只读锁定');
}
if (enhancementCalculation.dps === baseline.dps) {
  throw new Error('修改附魔镶嵌后 DPS 没有变化');
}

const dynamicGemFields = calculator.customizationFieldsFor(customEnhancements);
const secondGemField = dynamicGemFields.find((field) => field.key === '五彩石属性二');
const thirdGemField = dynamicGemFields.find((field) => field.key === '五彩石属性三');
if (!secondGemField.options.includes('破防') || !thirdGemField.options.includes('攻击')) {
  throw new Error('五彩石联动候选未按工作簿公式更新');
}

// 回归：缓存预设与公式上下文不一致时必须锁定编辑，避免单件装备导致 DPS 突变。
for (const [buildIndex, buildSelection] of calculator.buildSelections.entries()) {
  const buildCalculation = calculator.calculate(buildSelection, calculator.buildCustomizations[buildIndex]);
  const relativeDifference = Math.abs(buildCalculation.outputs.dps - buildCalculation.dps)
    / Math.max(1, Math.abs(buildCalculation.dps));
  const shouldAllowCustomization = relativeDifference <= 1e-8;
  if (buildCalculation.canCustomize !== shouldAllowCustomization) {
    throw new Error(`装备 ${buildIndex + 1} 的只读状态与缓存偏差不一致`);
  }
  if (!shouldAllowCustomization && buildCalculation.source !== '工作簿缓存值（只读）') {
    throw new Error(`装备 ${buildIndex + 1} 未明确标记为只读缓存值`);
  }
}

let formulaAnchors = 0;
let serializedEmptyStrings = 0;
for (const [sheetName, sheetModel] of Object.entries(BINGXIN_FORMULA_MODEL.sheets)) {
  for (const [address, cellModel] of Object.entries(sheetModel.cells)) {
    if (!cellModel.f) continue;
    formulaAnchors += 1;
    const calculatedValue = BingxinFormulaRuntime.scalar(regressionWorkbook.getCell(sheetName, address));
    const cachedValue = cellModel.c;
    const cellReference = `${sheetName}!${address}`;

    if (BingxinFormulaRuntime.isFormulaError(calculatedValue)) {
      if (calculatedValue.__formulaError !== cachedValue) {
        throw new Error(`${cellReference} 公式错误不一致：${calculatedValue.__formulaError} !== ${cachedValue}`);
      }
      continue;
    }
    if (typeof calculatedValue === 'number' && typeof cachedValue === 'number') {
      const tolerance = Math.max(1, Math.abs(cachedValue)) * 1e-10;
      if (Math.abs(calculatedValue - cachedValue) > tolerance) {
        throw new Error(`${cellReference} 数值不一致：${calculatedValue} !== ${cachedValue}`);
      }
      continue;
    }
    if (calculatedValue === cachedValue) continue;
    if (calculatedValue === '' && cachedValue === null) {
      serializedEmptyStrings += 1;
      continue;
    }
    throw new Error(`${cellReference} 缓存值不一致：${calculatedValue} !== ${cachedValue}`);
  }
}

console.log(JSON.stringify({
  baselineDps: baseline.dps,
  customDps: customCalculation.dps,
  enhancementDps: enhancementCalculation.dps,
  replacement,
  formulaAnchors,
  serializedEmptyStrings,
}, null, 2));
