(function (root) {
  'use strict';

  const ERROR_KEY = '__formulaError';

  function formulaError(code) {
    return { [ERROR_KEY]: code };
  }

  function isFormulaError(value) {
    return Boolean(value && typeof value === 'object' && value[ERROR_KEY]);
  }

  function isMatrix(value) {
    return Array.isArray(value);
  }

  function matrix(value) {
    if (!isMatrix(value)) return [[value]];
    if (!value.length) return [];
    return Array.isArray(value[0]) ? value : value.map((entry) => [entry]);
  }

  function scalar(value) {
    let current = value;
    while (isMatrix(current)) {
      if (!current.length) return null;
      current = Array.isArray(current[0]) ? current[0][0] : current[0];
    }
    return current;
  }

  function flatten(value) {
    return isMatrix(value) ? value.flat(Infinity) : [value];
  }

  function dimensions(value) {
    const normalized = matrix(value);
    return { rows: normalized.length, columns: normalized[0]?.length || 0 };
  }

  function matrixEntry(value, rowIndex, columnIndex) {
    if (!isMatrix(value)) return value;
    const normalized = matrix(value);
    const row = normalized[normalized.length === 1 ? 0 : rowIndex];
    return row?.[row.length === 1 ? 0 : columnIndex];
  }

  function mapMatrix(value, callback) {
    if (!isMatrix(value)) return callback(value, 0, 0);
    return matrix(value).map((row, rowIndex) => row.map((entry, columnIndex) => callback(entry, rowIndex, columnIndex)));
  }

  function broadcast(left, right, callback) {
    if (!isMatrix(left) && !isMatrix(right)) return callback(left, right);
    const leftSize = dimensions(left);
    const rightSize = dimensions(right);
    const rows = Math.max(leftSize.rows || 1, rightSize.rows || 1);
    const columns = Math.max(leftSize.columns || 1, rightSize.columns || 1);
    const compatibleRows = [leftSize.rows, rightSize.rows].every((size) => !size || size === 1 || size === rows);
    const compatibleColumns = [leftSize.columns, rightSize.columns].every((size) => !size || size === 1 || size === columns);
    if (!compatibleRows || !compatibleColumns) return formulaError('#VALUE!');
    return Array.from({ length: rows }, (_, rowIndex) =>
      Array.from({ length: columns }, (_, columnIndex) =>
        callback(matrixEntry(left, rowIndex, columnIndex), matrixEntry(right, rowIndex, columnIndex)),
      ),
    );
  }

  function numeric(value) {
    const singleValue = scalar(value);
    if (isFormulaError(singleValue)) return singleValue;
    if (singleValue === null || singleValue === '' || singleValue === false) return 0;
    if (singleValue === true) return 1;
    const number = Number(singleValue);
    return Number.isFinite(number) ? number : formulaError('#VALUE!');
  }

  function text(value) {
    const singleValue = scalar(value);
    if (singleValue === null) return '';
    if (singleValue === true) return 'TRUE';
    if (singleValue === false) return 'FALSE';
    if (typeof singleValue === 'number') return Number(singleValue.toPrecision(15)).toString();
    return String(singleValue);
  }

  function logical(value) {
    const singleValue = scalar(value);
    if (isFormulaError(singleValue)) return singleValue;
    if (typeof singleValue === 'string') return singleValue.length > 0;
    return Boolean(singleValue);
  }

  function compare(left, right, operator) {
    if (isFormulaError(left)) return left;
    if (isFormulaError(right)) return right;
    const normalizedLeft = typeof left === 'string' ? left.toLocaleLowerCase() : left ?? 0;
    const normalizedRight = typeof right === 'string' ? right.toLocaleLowerCase() : right ?? 0;
    if (operator === '=') return normalizedLeft === normalizedRight;
    if (operator === '<>') return normalizedLeft !== normalizedRight;
    if (operator === '<') return normalizedLeft < normalizedRight;
    if (operator === '>') return normalizedLeft > normalizedRight;
    if (operator === '<=') return normalizedLeft <= normalizedRight;
    return normalizedLeft >= normalizedRight;
  }

  function binaryOperation(operator, left, right) {
    return broadcast(left, right, (leftEntry, rightEntry) => {
      if (['=', '<>', '<', '>', '<=', '>='].includes(operator)) return compare(leftEntry, rightEntry, operator);
      if (isFormulaError(leftEntry)) return leftEntry;
      if (isFormulaError(rightEntry)) return rightEntry;
      if (operator === '&') return text(leftEntry) + text(rightEntry);
      const leftNumber = numeric(leftEntry);
      const rightNumber = numeric(rightEntry);
      if (isFormulaError(leftNumber)) return leftNumber;
      if (isFormulaError(rightNumber)) return rightNumber;
      if (operator === '+') return leftNumber + rightNumber;
      if (operator === '-') return leftNumber - rightNumber;
      if (operator === '*') return leftNumber * rightNumber;
      if (operator === '/') return rightNumber === 0 ? formulaError('#DIV/0!') : leftNumber / rightNumber;
      if (operator === '^') return leftNumber ** rightNumber;
      return formulaError('#NAME?');
    });
  }

  function excelRound(number, digits) {
    const factor = 10 ** digits;
    return Math.sign(number) * Math.round(Math.abs(number) * factor + Number.EPSILON) / factor;
  }

  function normalizeAddress(address) {
    return address.replaceAll('$', '').toUpperCase();
  }

  function columnNumber(columnLetters) {
    return [...columnLetters.toUpperCase()].reduce((total, letter) => total * 26 + letter.charCodeAt(0) - 64, 0);
  }

  function columnLetters(columnIndex) {
    let current = columnIndex;
    let letters = '';
    while (current > 0) {
      const remainder = (current - 1) % 26;
      letters = String.fromCharCode(65 + remainder) + letters;
      current = Math.floor((current - 1) / 26);
    }
    return letters;
  }

  function addressParts(address) {
    const match = normalizeAddress(address).match(/^([A-Z]{1,3})(\d+)$/);
    if (!match) return null;
    return { column: columnNumber(match[1]), row: Number(match[2]) };
  }

  function rangeParts(reference) {
    const [startAddress, endAddress = startAddress] = reference.split(':').map(normalizeAddress);
    const start = addressParts(startAddress);
    const end = addressParts(endAddress);
    return start && end ? { start, end } : null;
  }

  function quoteFreeSheetName(sheetName) {
    if (sheetName.startsWith("'") && sheetName.endsWith("'")) {
      return sheetName.slice(1, -1).replaceAll("''", "'");
    }
    return sheetName;
  }

  function splitSheetReference(reference, defaultSheet) {
    const separator = reference.lastIndexOf('!');
    if (separator < 0) return { sheet: defaultSheet, address: reference };
    return {
      sheet: quoteFreeSheetName(reference.slice(0, separator)),
      address: reference.slice(separator + 1),
    };
  }

  class FormulaWorkbook {
    constructor(model) {
      this.model = model;
      this.cellCache = new Map();
      this.nameCache = new Map();
      this.overrides = new Map();
      this.activeCells = new Set();
      this.spillChildren = new Map();
      this.indexSpills();
    }

    indexSpills() {
      for (const [sheetName, sheetModel] of Object.entries(this.model.sheets)) {
        for (const [anchorAddress, cellModel] of Object.entries(sheetModel.cells)) {
          if (!cellModel.s) continue;
          const spillRange = rangeParts(cellModel.s);
          for (let row = spillRange.start.row; row <= spillRange.end.row; row += 1) {
            for (let column = spillRange.start.column; column <= spillRange.end.column; column += 1) {
              const childAddress = `${columnLetters(column)}${row}`;
              if (childAddress === normalizeAddress(anchorAddress)) continue;
              this.spillChildren.set(this.cellKey(sheetName, childAddress), {
                anchor: normalizeAddress(anchorAddress),
                rowOffset: row - spillRange.start.row,
                columnOffset: column - spillRange.start.column,
              });
            }
          }
        }
      }
    }

    cellKey(sheetName, address) {
      return `${sheetName}!${normalizeAddress(address)}`;
    }

    setCell(sheetName, address, value) {
      this.overrides.set(this.cellKey(sheetName, address), value);
      this.clearCalculationCache();
    }

    setCells(changes) {
      for (const change of changes) {
        this.overrides.set(this.cellKey(change.sheet, change.address), change.value);
      }
      this.clearCalculationCache();
    }

    clearCalculationCache() {
      this.cellCache.clear();
      this.nameCache.clear();
      this.activeCells.clear();
    }

    getCell(sheetName, address) {
      const normalizedAddress = normalizeAddress(address);
      const key = this.cellKey(sheetName, normalizedAddress);
      if (this.overrides.has(key)) return this.overrides.get(key);
      const spillChild = this.spillChildren.get(key);
      if (spillChild) {
        const spillValue = this.getCell(sheetName, spillChild.anchor);
        return matrixEntry(spillValue, spillChild.rowOffset, spillChild.columnOffset);
      }
      if (this.cellCache.has(key)) return this.cellCache.get(key);
      if (this.activeCells.has(key)) return formulaError('#CYCLE!');

      const cellModel = this.model.sheets[sheetName]?.cells[normalizedAddress];
      if (!cellModel) return null;
      this.activeCells.add(key);
      let calculatedValue;
      if (cellModel.f) calculatedValue = this.evaluate(cellModel.f, { sheet: sheetName, locals: Object.create(null) });
      else if (Object.hasOwn(cellModel, 'v')) calculatedValue = cellModel.v;
      else calculatedValue = cellModel.c ?? null;
      this.activeCells.delete(key);
      this.cellCache.set(key, calculatedValue);
      return calculatedValue;
    }

    getCachedCell(sheetName, address) {
      const cellModel = this.model.sheets[sheetName]?.cells[normalizeAddress(address)];
      return cellModel?.c ?? cellModel?.v ?? null;
    }

    getOutputs() {
      return Object.fromEntries(
        Object.entries(this.model.outputs).map(([outputName, [sheetName, address]]) => [outputName, scalar(this.getCell(sheetName, address))]),
      );
    }

    evaluate(node, context) {
      const nodeType = node[0];
      if (nodeType === 'z') return null;
      if (nodeType === 'n' || nodeType === 's' || nodeType === 'b') return node[1];
      if (nodeType === 'r') return this.resolveReference(node[1], context);
      if (nodeType === 'o') return binaryOperation(node[1], this.evaluate(node[2], context), this.evaluate(node[3], context));
      if (nodeType === 'u') return this.unary(node[1], this.evaluate(node[2], context));
      if (nodeType === 'p') return this.postfix(node[1], this.evaluate(node[2], context));
      if (nodeType === 'f') return this.callFunction(node[1], node[2], context);
      return formulaError('#NAME?');
    }

    unary(operator, value) {
      return mapMatrix(value, (entry) => {
        const number = numeric(entry);
        if (isFormulaError(number)) return number;
        return operator === '-' ? -number : number;
      });
    }

    postfix(operator, value) {
      if (operator !== '%') return formulaError('#NAME?');
      return mapMatrix(value, (entry) => {
        const number = numeric(entry);
        return isFormulaError(number) ? number : number / 100;
      });
    }

    resolveReference(reference, context, preserveSpill = false) {
      if (reference.startsWith('“') && reference.endsWith('”')) return reference.slice(1, -1);
      if (reference in context.locals) return context.locals[reference];
      if (this.model.names[reference]) return this.evaluateName(reference, context);
      if (reference.includes('[')) return this.structuredReference(reference);

      const { sheet, address } = splitSheetReference(reference, context.sheet);
      const referenceRange = rangeParts(address);
      if (!referenceRange) return formulaError('#NAME?');
      if (referenceRange.start.row === referenceRange.end.row && referenceRange.start.column === referenceRange.end.column) {
        const cellValue = this.getCell(sheet, `${columnLetters(referenceRange.start.column)}${referenceRange.start.row}`);
        return preserveSpill ? cellValue : scalar(cellValue);
      }
      return this.rangeValues(sheet, referenceRange);
    }

    rangeValues(sheetName, referenceRange) {
      const rows = [];
      for (let row = referenceRange.start.row; row <= referenceRange.end.row; row += 1) {
        const rowValues = [];
        for (let column = referenceRange.start.column; column <= referenceRange.end.column; column += 1) {
          rowValues.push(scalar(this.getCell(sheetName, `${columnLetters(column)}${row}`)));
        }
        rows.push(rowValues);
      }
      return rows;
    }

    structuredReference(reference) {
      const tableName = reference.slice(0, reference.indexOf('['));
      const tableModel = this.model.tables[tableName];
      if (!tableModel) return formulaError('#NAME?');
      const tableRange = rangeParts(tableModel.ref);
      const dataStartRow = tableRange.start.row + 1;
      const dataEndRow = tableRange.end.row - tableModel.totals;
      const columnNames = [...reference.matchAll(/\[([^\]]*)\]/g)].map((match) => match[1]).filter(Boolean);
      let startColumn = tableRange.start.column;
      let endColumn = tableRange.end.column;
      if (columnNames.length) {
        const firstIndex = tableModel.headers.indexOf(columnNames[0]);
        const lastIndex = tableModel.headers.indexOf(columnNames[columnNames.length - 1]);
        if (firstIndex < 0 || lastIndex < 0) return formulaError('#REF!');
        startColumn += firstIndex;
        endColumn = tableRange.start.column + lastIndex;
      }
      return this.rangeValues(tableModel.sheet, {
        start: { row: dataStartRow, column: startColumn },
        end: { row: dataEndRow, column: endColumn },
      });
    }

    evaluateName(name, context) {
      if (this.nameCache.has(name)) return this.nameCache.get(name);
      const expression = this.model.names[name];
      if (!expression) return formulaError('#NAME?');
      if (expression[0] === 'f' && expression[1] === 'LAMBDA') return formulaError('#VALUE!');
      const calculatedValue = this.evaluate(expression, context);
      this.nameCache.set(name, calculatedValue);
      return calculatedValue;
    }

    callNamedFunction(name, argumentNodes, context) {
      const definition = this.model.names[name];
      if (!definition || definition[0] !== 'f' || definition[1] !== 'LAMBDA') return formulaError('#NAME?');
      const lambdaParts = definition[2];
      const body = lambdaParts[lambdaParts.length - 1];
      const locals = Object.create(context.locals);
      lambdaParts.slice(0, -1).forEach((parameterNode, parameterIndex) => {
        const parameterName = parameterNode[1];
        locals[parameterName] = this.evaluate(argumentNodes[parameterIndex] || ['z'], context);
      });
      return this.evaluate(body, { sheet: context.sheet, locals });
    }

    callFunction(name, argumentNodes, context) {
      if (this.model.names[name]) return this.callNamedFunction(name, argumentNodes, context);
      if (name === 'LET') return this.evaluateLet(argumentNodes, context);
      if (name === 'IF') return this.evaluateIf(argumentNodes, context);
      if (name === 'IFS') return this.evaluateIfs(argumentNodes, context);
      if (name === 'IFERROR') return this.evaluateIfError(argumentNodes, context);
      if (name === 'ANCHORARRAY') return this.evaluateAnchorArray(argumentNodes[0], context);
      if (name === 'OFFSET') return this.evaluateOffset(argumentNodes, context);
      const argumentsList = argumentNodes.map((argumentNode) => this.evaluate(argumentNode, context));
      return this.standardFunction(name, argumentsList);
    }

    evaluateLet(argumentNodes, context) {
      const locals = Object.create(context.locals);
      for (let index = 0; index < argumentNodes.length - 1; index += 2) {
        const nameNode = argumentNodes[index];
        locals[nameNode[1]] = this.evaluate(argumentNodes[index + 1], { sheet: context.sheet, locals });
      }
      return this.evaluate(argumentNodes[argumentNodes.length - 1], { sheet: context.sheet, locals });
    }

    evaluateIf(argumentNodes, context) {
      const condition = this.evaluate(argumentNodes[0], context);
      if (!isMatrix(condition)) {
        const decision = logical(condition);
        if (isFormulaError(decision)) return decision;
        return this.evaluate(argumentNodes[decision ? 1 : 2] || ['b', false], context);
      }
      const whenTrue = this.evaluate(argumentNodes[1], context);
      const whenFalse = this.evaluate(argumentNodes[2] || ['b', false], context);
      return broadcast(condition, broadcast(whenTrue, whenFalse, (trueValue, falseValue) => ({ trueValue, falseValue })), (conditionValue, choices) =>
        logical(conditionValue) ? choices.trueValue : choices.falseValue,
      );
    }

    evaluateIfs(argumentNodes, context) {
      for (let index = 0; index < argumentNodes.length; index += 2) {
        const condition = logical(this.evaluate(argumentNodes[index], context));
        if (isFormulaError(condition)) return condition;
        if (condition) return this.evaluate(argumentNodes[index + 1], context);
      }
      return formulaError('#N/A');
    }

    evaluateIfError(argumentNodes, context) {
      const calculatedValue = this.evaluate(argumentNodes[0], context);
      const fallback = () => this.evaluate(argumentNodes[1], context);
      if (!isMatrix(calculatedValue)) return isFormulaError(calculatedValue) ? fallback() : calculatedValue;
      const fallbackValue = fallback();
      return mapMatrix(calculatedValue, (entry, rowIndex, columnIndex) =>
        isFormulaError(entry) ? matrixEntry(fallbackValue, rowIndex, columnIndex) : entry,
      );
    }

    evaluateAnchorArray(argumentNode, context) {
      if (argumentNode?.[0] !== 'r') return formulaError('#REF!');
      return this.resolveReference(argumentNode[1], context, true);
    }

    evaluateOffset(argumentNodes, context) {
      const referenceNode = argumentNodes[0];
      if (referenceNode?.[0] !== 'r') return formulaError('#REF!');
      const { sheet, address } = splitSheetReference(referenceNode[1], context.sheet);
      const baseRange = rangeParts(address);
      if (!baseRange) return formulaError('#REF!');
      const rowOffset = numeric(this.evaluate(argumentNodes[1], context));
      const columnOffset = numeric(this.evaluate(argumentNodes[2], context));
      const defaultHeight = baseRange.end.row - baseRange.start.row + 1;
      const defaultWidth = baseRange.end.column - baseRange.start.column + 1;
      const height = argumentNodes[3]?.[0] === 'z' || !argumentNodes[3] ? defaultHeight : numeric(this.evaluate(argumentNodes[3], context));
      const width = argumentNodes[4]?.[0] === 'z' || !argumentNodes[4] ? defaultWidth : numeric(this.evaluate(argumentNodes[4], context));
      if ([rowOffset, columnOffset, height, width].some(isFormulaError)) return formulaError('#VALUE!');
      return this.rangeValues(sheet, {
        start: { row: baseRange.start.row + rowOffset, column: baseRange.start.column + columnOffset },
        end: { row: baseRange.start.row + rowOffset + height - 1, column: baseRange.start.column + columnOffset + width - 1 },
      });
    }

    standardFunction(name, args) {
      if (name === 'INT') return mapMatrix(args[0], (entry) => {
        const number = numeric(entry);
        return isFormulaError(number) ? number : Math.floor(number);
      });
      if (name === 'LEN') return mapMatrix(args[0], (entry) => isFormulaError(entry) ? entry : text(entry).length);
      if (name === 'NOT') return mapMatrix(args[0], (entry) => {
        const decision = logical(entry);
        return isFormulaError(decision) ? decision : !decision;
      });
      if (name === 'TRUE') return true;
      if (name === 'FALSE') return false;
      if (name === 'AND' || name === 'OR') {
        const decisions = flatten(args).map(logical);
        const formulaFailure = decisions.find(isFormulaError);
        if (formulaFailure) return formulaFailure;
        return name === 'AND' ? decisions.every(Boolean) : decisions.some(Boolean);
      }
      if (name === 'SUM') return this.aggregateNumbers(args, (numbers) => numbers.reduce((sum, number) => sum + number, 0));
      if (name === 'AVERAGE') return this.aggregateNumbers(args, (numbers) => numbers.reduce((sum, number) => sum + number, 0) / numbers.length);
      if (name === 'MIN') return this.aggregateNumbers(args, (numbers) => Math.min(...numbers));
      if (name === 'MAX' || name === 'MAXA') return this.aggregateNumbers(args, (numbers) => Math.max(...numbers));
      if (name === 'COUNTA') return flatten(args).filter((entry) => entry !== null && entry !== '').length;
      if (name === 'ROUND') return this.vectorMath(args, (number, digits) => excelRound(number, digits));
      if (name === 'ROUNDUP') return this.vectorMath(args, (number, digits) => Math.sign(number) * Math.ceil(Math.abs(number) * 10 ** digits) / 10 ** digits);
      if (name === 'ROUNDDOWN') return this.vectorMath(args, (number, digits) => Math.sign(number) * Math.floor(Math.abs(number) * 10 ** digits) / 10 ** digits);
      if (name === 'FLOOR') return this.vectorMath(args, (number, significance) => Math.floor(number / significance) * significance);
      if (name === 'MOD') return this.vectorMath(args, (number, divisor) => ((number % divisor) + divisor) % divisor);
      if (name === 'VALUE') return mapMatrix(args[0], (entry) => this.valueNumber(entry));
      if (name === 'ISERROR') return mapMatrix(args[0], isFormulaError);
      if (name === 'LEFT') return this.textSlice(args, true);
      if (name === 'MID') return this.middleText(args);
      if (name === 'FIND') return this.findText(args);
      if (name === 'CHAR') return mapMatrix(args[0], (entry) => {
        const characterCode = numeric(entry);
        return isFormulaError(characterCode) ? characterCode : String.fromCharCode(characterCode);
      });
      if (name === 'TEXT') return this.formatText(args);
      if (name === 'HYPERLINK') return args[1] ?? args[0];
      if (name === 'COUNTIF') return this.countIf(args[0], args[1]);
      if (name === 'SUMIFS') return this.sumIfs(args);
      if (name === 'MINIFS') return this.minIfs(args);
      if (name === 'SUMPRODUCT') return this.sumProduct(args);
      if (name === 'XLOOKUP') return this.xlookup(args);
      if (name === 'INDEX') return this.index(args);
      if (name === 'VSTACK') return args.flatMap((argument) => matrix(argument));
      if (name === 'UNIQUE') return this.unique(args);
      if (name === 'FILTER') return this.filter(args);
      if (name === 'SORT') return this.sort(args);
      if (name === 'TRANSPOSE') return this.transpose(args[0]);
      if (name === 'SMALL') return this.small(args);
      return formulaError('#NAME?');
    }

    aggregateNumbers(args, aggregate) {
      const entries = flatten(args);
      const formulaFailure = entries.find(isFormulaError);
      if (formulaFailure) return formulaFailure;
      const numbers = entries.map(numeric).filter((entry) => !isFormulaError(entry));
      return numbers.length ? aggregate(numbers) : 0;
    }

    vectorMath(args, callback) {
      return broadcast(args[0], args[1], (left, right) => {
        const leftNumber = numeric(left);
        const rightNumber = numeric(right);
        if (isFormulaError(leftNumber)) return leftNumber;
        if (isFormulaError(rightNumber)) return rightNumber;
        return callback(leftNumber, rightNumber);
      });
    }

    valueNumber(entry) {
      if (typeof entry === 'number') return entry;
      const trimmed = text(entry).trim();
      const parsed = trimmed.endsWith('%') ? Number(trimmed.slice(0, -1)) / 100 : Number(trimmed);
      return Number.isFinite(parsed) ? parsed : formulaError('#VALUE!');
    }

    textSlice(args, fromLeft) {
      return broadcast(args[0], args[1] ?? 1, (textEntry, countEntry) => {
        const source = text(textEntry);
        const count = numeric(countEntry);
        return fromLeft ? source.slice(0, count) : source.slice(-count);
      });
    }

    middleText(args) {
      const startAndLength = broadcast(args[1], args[2], (start, length) => ({ start: numeric(start), length: numeric(length) }));
      return broadcast(args[0], startAndLength, (source, parts) => text(source).slice(parts.start - 1, parts.start - 1 + parts.length));
    }

    findText(args) {
      const startPosition = args[2] ?? 1;
      const searchAndStart = broadcast(args[0], startPosition, (search, start) => ({ search: text(search), start: numeric(start) }));
      return broadcast(args[1], searchAndStart, (source, parts) => {
        const index = text(source).indexOf(parts.search, parts.start - 1);
        return index < 0 ? formulaError('#VALUE!') : index + 1;
      });
    }

    formatText(args) {
      const number = numeric(args[0]);
      const pattern = text(args[1]);
      if (isFormulaError(number)) return number;
      if (/^0\.0+$/.test(pattern)) return number.toFixed(pattern.length - 2);
      return String(number);
    }

    matchesCriterion(entry, criterion) {
      const criterionText = typeof criterion === 'string' ? criterion : null;
      if (!criterionText) return compare(entry, criterion, '=');
      const match = criterionText.match(/^(<=|>=|<>|=|<|>)(.*)$/);
      if (!match) return compare(entry, criterion, '=');
      const comparisonValue = Number.isNaN(Number(match[2])) ? match[2] : Number(match[2]);
      return compare(entry, comparisonValue, match[1]);
    }

    countIf(range, criterion) {
      if (isMatrix(criterion)) return mapMatrix(criterion, (criterionEntry) => this.countIf(range, criterionEntry));
      return flatten(range).filter((entry) => this.matchesCriterion(entry, scalar(criterion))).length;
    }

    sumIfs(args) {
      const vectorCriterion = args.slice(2).filter((_, index) => index % 2 === 0).find(isMatrix);
      if (vectorCriterion) {
        return mapMatrix(vectorCriterion, (_, rowIndex, columnIndex) => {
          const scalarArgs = args.map((argument, argumentIndex) =>
            argumentIndex >= 2 && argumentIndex % 2 === 0 ? matrixEntry(argument, rowIndex, columnIndex) : argument,
          );
          return this.sumIfs(scalarArgs);
        });
      }
      const sumEntries = flatten(args[0]);
      return sumEntries.reduce((total, entry, index) => {
        for (let argumentIndex = 1; argumentIndex < args.length; argumentIndex += 2) {
          if (!this.matchesCriterion(flatten(args[argumentIndex])[index], scalar(args[argumentIndex + 1]))) return total;
        }
        const number = numeric(entry);
        return isFormulaError(number) ? total : total + number;
      }, 0);
    }

    minIfs(args) {
      const vectorCriterion = args.slice(2).filter((_, index) => index % 2 === 0).find(isMatrix);
      if (vectorCriterion) {
        return mapMatrix(vectorCriterion, (_, rowIndex, columnIndex) => {
          const scalarArgs = args.map((argument, argumentIndex) =>
            argumentIndex >= 2 && argumentIndex % 2 === 0 ? matrixEntry(argument, rowIndex, columnIndex) : argument,
          );
          return this.minIfs(scalarArgs);
        });
      }
      const values = flatten(args[0]).filter((entry, index) => {
        for (let argumentIndex = 1; argumentIndex < args.length; argumentIndex += 2) {
          if (!this.matchesCriterion(flatten(args[argumentIndex])[index], scalar(args[argumentIndex + 1]))) return false;
        }
        return true;
      }).map(numeric).filter((entry) => !isFormulaError(entry));
      return values.length ? Math.min(...values) : 0;
    }

    sumProduct(args) {
      const arrays = args.map(flatten);
      const length = Math.max(...arrays.map((entries) => entries.length));
      let total = 0;
      for (let index = 0; index < length; index += 1) {
        let product = 1;
        for (const entries of arrays) {
          const number = numeric(entries.length === 1 ? entries[0] : entries[index]);
          if (isFormulaError(number)) return number;
          product *= number;
        }
        total += product;
      }
      return total;
    }

    xlookup(args) {
      const lookupValue = args[0];
      if (isMatrix(lookupValue)) {
        const lookupMatrix = matrix(lookupValue);
        const results = lookupMatrix.map((row) => row.map((entry) => this.xlookupScalar(entry, args.slice(1))));
        const allScalar = results.every((row) => row.every((entry) => !isMatrix(entry)));
        return allScalar ? results : results.flatMap((row) => row.flatMap((entry) => matrix(entry)));
      }
      return this.xlookupScalar(lookupValue, args.slice(1));
    }

    xlookupScalar(lookupValue, args) {
      const lookupArray = matrix(args[0]);
      const returnArray = matrix(args[1]);
      const notFound = args[2] ?? formulaError('#N/A');
      const matchMode = numeric(args[3] ?? 0);
      const vertical = lookupArray[0]?.length === 1;
      const entries = vertical ? lookupArray.map((row) => row[0]) : lookupArray[0];
      let matchIndex = entries.findIndex((entry) => compare(entry, scalar(lookupValue), '='));
      if (matchIndex < 0 && matchMode === -1) {
        const candidates = entries
          .map((entry, index) => ({ entry, index }))
          .filter((candidate) => compare(candidate.entry, scalar(lookupValue), '<='))
          .sort((left, right) => compare(left.entry, right.entry, '=') ? 0 : compare(left.entry, right.entry, '<') ? 1 : -1);
        matchIndex = candidates[0]?.index ?? -1;
      }
      if (matchIndex < 0 && matchMode === 1) {
        const candidates = entries
          .map((entry, index) => ({ entry, index }))
          .filter((candidate) => compare(candidate.entry, scalar(lookupValue), '>='))
          .sort((left, right) => compare(left.entry, right.entry, '=') ? 0 : compare(left.entry, right.entry, '<') ? -1 : 1);
        matchIndex = candidates[0]?.index ?? -1;
      }
      if (matchIndex < 0) return notFound;
      if (vertical) return returnArray[matchIndex]?.length === 1 ? returnArray[matchIndex][0] : [returnArray[matchIndex]];
      const column = returnArray.map((row) => [row[matchIndex]]);
      return column.length === 1 ? column[0][0] : column;
    }

    index(args) {
      const source = matrix(args[0]);
      const rowNumber = numeric(args[1] ?? 1);
      const columnNumberValue = numeric(args[2] ?? 1);
      if (rowNumber === 0) return source.map((row) => [row[columnNumberValue - 1]]);
      if (columnNumberValue === 0) return [source[rowNumber - 1]];
      return source[rowNumber - 1]?.[columnNumberValue - 1] ?? formulaError('#REF!');
    }

    unique(args) {
      const source = matrix(args[0]);
      const byColumn = logical(args[1] ?? false);
      const exactlyOnce = logical(args[2] ?? false);
      const records = byColumn ? this.transpose(source) : source;
      const counts = new Map(records.map((record) => [JSON.stringify(record), 0]));
      records.forEach((record) => counts.set(JSON.stringify(record), counts.get(JSON.stringify(record)) + 1));
      const uniqueRecords = records.filter((record, index) => {
        const key = JSON.stringify(record);
        return exactlyOnce ? counts.get(key) === 1 : records.findIndex((candidate) => JSON.stringify(candidate) === key) === index;
      });
      return byColumn ? this.transpose(uniqueRecords) : uniqueRecords;
    }

    filter(args) {
      const source = matrix(args[0]);
      const include = matrix(args[1]);
      const filtered = source.filter((row, rowIndex) => logical(include[rowIndex]?.[0] ?? include[0]?.[rowIndex]));
      return filtered.length ? filtered : args[2] ?? formulaError('#CALC!');
    }

    sort(args) {
      const source = matrix(args[0]).map((row) => [...row]);
      const sortIndex = numeric(args[1] ?? 1) - 1;
      const sortOrder = numeric(args[2] ?? 1);
      const byColumn = logical(args[3] ?? false);
      if (byColumn) return this.transpose(this.sort([this.transpose(source), sortIndex + 1, sortOrder, false]));
      return source.sort((left, right) => {
        if (compare(left[sortIndex], right[sortIndex], '=')) return 0;
        return compare(left[sortIndex], right[sortIndex], '<') ? -sortOrder : sortOrder;
      });
    }

    transpose(sourceValue) {
      const source = matrix(sourceValue);
      return Array.from({ length: source[0]?.length || 0 }, (_, columnIndex) => source.map((row) => row[columnIndex]));
    }

    small(args) {
      const numbers = flatten(args[0]).map(numeric).filter((entry) => !isFormulaError(entry)).sort((left, right) => left - right);
      const rank = numeric(args[1]);
      return numbers[rank - 1] ?? formulaError('#NUM!');
    }
  }

  root.BingxinFormulaRuntime = {
    FormulaWorkbook,
    formulaError,
    isFormulaError,
    scalar,
  };
})(typeof window === 'undefined' ? globalThis : window);
