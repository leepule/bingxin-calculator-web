'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

global.window = global;
require('../src/generated/data.js');
require('../src/generated/formula-model.js');
require('../src/engine/formula-runtime.js');
require('../src/engine/calculator.js');

// 回归：自定义计算必须与独立表格引擎或源工作簿缓存一致，不能只断言“数值发生变化”。
const fixturePath = path.join(__dirname, 'fixtures', 'formula-goldens.json');
const goldens = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

function assertEqual(scenario, actual, expected) {
  if (actual !== expected) throw new Error(`${scenario}：${actual} !== ${expected}`);
}

function assertArray(scenario, actual, expected) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(`${scenario}：${JSON.stringify(actual)} !== ${JSON.stringify(expected)}`);
  }
}

function assertRelativeClose(scenario, actual, expected, tolerance) {
  const relativeDifference = Math.abs(actual - expected) / Math.max(1, Math.abs(expected));
  if (relativeDifference > tolerance) {
    throw new Error(`${scenario}：${actual} 与黄金值 ${expected} 偏差 ${relativeDifference}`);
  }
}

function semanticWorkbook() {
  return new BingxinFormulaRuntime.FormulaWorkbook({
    sheets: {
      Cases: {
        cells: {
          A1: { v: 10 }, A2: { v: 20 }, A3: { v: 30 }, A4: { v: 40 },
          B1: { v: 100 }, B2: { v: 200 }, B3: { v: 300 }, B4: { v: 400 },
          C1: { v: true }, C2: { v: false }, C3: { v: true }, C4: { v: false },
          D1: { f: ['f', 'XLOOKUP', [['n', 20], ['r', 'A1:A4'], ['r', 'B1:B4']]] },
          D2: { f: ['f', 'XLOOKUP', [['n', 25], ['r', 'A1:A4'], ['r', 'B1:B4'], ['s', 'missing'], ['u', '-', ['n', 1]]]] },
          D3: { f: ['f', 'XLOOKUP', [['n', 25], ['r', 'A1:A4'], ['r', 'B1:B4'], ['s', 'missing'], ['n', 1]]] },
          D4: { f: ['f', 'IF', [['b', true], ['n', 7], ['o', '/', ['n', 1], ['n', 0]]]] },
          D5: { f: ['f', 'IFERROR', [['o', '/', ['n', 1], ['n', 0]], ['n', 9]]] },
          D6: { f: ['r', 'A10'] },
          D7: { f: ['o', '+', ['r', 'A10'], ['n', 1]] },
          D8: { f: ['s', ''] },
          E1: { f: ['f', 'FILTER', [['r', 'A1:A4'], ['r', 'C1:C4']]], s: 'E1:E2' },
          F1: { f: ['o', '+', ['r', 'A1:A4'], ['n', 10]], s: 'F1:F4' }
        }
      }
    },
    tables: {},
    names: {},
    outputs: {}
  });
}

const semanticGoldens = goldens.formulaSemantics.cases;
const workbook = semanticWorkbook();
assertEqual('XLOOKUP 精确匹配', workbook.getCell('Cases', 'D1'), semanticGoldens.xlookupExact);
assertEqual('XLOOKUP 向下近似匹配', workbook.getCell('Cases', 'D2'), semanticGoldens.xlookupNextSmaller);
assertEqual('XLOOKUP 向上近似匹配', workbook.getCell('Cases', 'D3'), semanticGoldens.xlookupNextLarger);
assertEqual('IF 未选分支不传播错误', workbook.getCell('Cases', 'D4'), semanticGoldens.ifLazyBranch);
assertEqual('IFERROR 返回备用值', workbook.getCell('Cases', 'D5'), semanticGoldens.ifErrorFallback);
assertEqual('公式直接引用空白单元格', workbook.getCell('Cases', 'D6'), semanticGoldens.blankDirectReference);
assertEqual('空白单元格参与数值运算', workbook.getCell('Cases', 'D7'), semanticGoldens.blankNumericCoercion);
assertEqual('公式空字符串保持为空字符串', workbook.getCell('Cases', 'D8'), semanticGoldens.emptyString);
assertArray('FILTER 动态数组', workbook.getCell('Cases', 'E1').flat(), semanticGoldens.filterDynamicArray);
assertArray('数组与标量广播', workbook.getCell('Cases', 'F1').flat(), semanticGoldens.broadcastAddition);
assertEqual('FILTER 溢出子单元格', workbook.getCell('Cases', 'E2'), semanticGoldens.filterDynamicArray[1]);
assertEqual('广播溢出子单元格', workbook.getCell('Cases', 'F4'), semanticGoldens.broadcastAddition.at(-1));

const calculatorGoldens = goldens.calculator;
const sourcePath = path.resolve(__dirname, '..', calculatorGoldens.source);
const sourceHash = crypto.createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex');
assertEqual('黄金夹具对应当前源工作簿', sourceHash, calculatorGoldens.sourceSha256);

const calculator = BingxinCalculator.createCalculator(APP_DATA);
for (const goldenCase of calculatorGoldens.cases) {
  const calculation = calculator.calculate({ ...calculator.baselineSelection, 裤子: goldenCase.pants });
  assertEqual(`${goldenCase.name} 使用完整公式重算`, calculation.source, '完整公式重算');
  assertEqual(`${goldenCase.name} 保持可编辑`, calculation.canCustomize, true);
  assertRelativeClose(goldenCase.name, calculation.dps, goldenCase.expectedDps, calculatorGoldens.relativeTolerance);
}

console.log(JSON.stringify({
  semanticCases: Object.keys(semanticGoldens).length + 2,
  calculatorGoldens: calculatorGoldens.cases.length,
  sourceSha256: sourceHash
}, null, 2));
