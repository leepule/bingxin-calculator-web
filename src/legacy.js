import './generated/data.js';
import './generated/formula-model.js';
import './engine/formula-runtime.js';
import './engine/calculator.js';

export const workbookData = window.APP_DATA;
export const calculatorEngine = window.BingxinCalculator.createCalculator(workbookData);
