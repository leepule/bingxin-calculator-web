import './generated/formula-model.js';
import './engine/formula-runtime.js';
import './engine/calculator.js';
import { workbookData } from './workbook-data.js';

export const calculatorEngine = window.BingxinCalculator.createCalculator(workbookData);
