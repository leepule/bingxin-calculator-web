self.window = self;

await import('../generated/data.js');
await import('../generated/formula-model.js');
await import('./formula-runtime.js');
await import('./calculator.js');

const calculator = self.BingxinCalculator.createCalculator(self.APP_DATA);

self.onmessage = ({ data }) => {
  const { requestId, selection, customization } = data;
  try {
    const calculation = calculator.calculate(selection, customization);
    self.postMessage({ requestId, calculation });
  } catch (calculationError) {
    const error = calculationError instanceof Error ? calculationError.message : String(calculationError);
    self.postMessage({ requestId, error });
  }
};
