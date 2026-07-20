(function (root) {
  'use strict';

  const SLOT_LAYOUT = [
    { key: '帽子', label: '帽子', catalogSlot: '帽子' },
    { key: '衣服', label: '衣服', catalogSlot: '衣服' },
    { key: '腰带', label: '腰带', catalogSlot: '腰带' },
    { key: '护手', label: '护手', catalogSlot: '护手' },
    { key: '裤子', label: '裤子', catalogSlot: '裤子' },
    { key: '鞋子', label: '鞋子', catalogSlot: '鞋子' },
    { key: '项链', label: '项链', catalogSlot: '项链' },
    { key: '腰坠', label: '腰坠', catalogSlot: '腰坠' },
    { key: '戒指1', label: '戒指一', catalogSlot: '戒指' },
    { key: '戒指2', label: '戒指二', catalogSlot: '戒指' },
    { key: '暗器', label: '暗器', catalogSlot: '暗器' },
    { key: '武器', label: '武器', catalogSlot: '武器' },
  ];

  const DAMAGE_ATTRIBUTES = ['会效', '会心', '无双', '破防', '破招', '攻击', '根骨'];
  const FORMULA_INPUT_CELLS = {
    帽子: 'H10',
    衣服: 'H11',
    腰带: 'H12',
    护手: 'H13',
    裤子: 'H14',
    鞋子: 'H15',
    项链: 'H16',
    腰坠: 'H17',
    戒指1: 'H18',
    戒指2: 'H19',
    暗器: 'H20',
    武器: 'H21',
  };

  function equipmentSelection(equipmentRows) {
    const selection = {};
    const slotCounts = {};

    for (const equipmentRow of equipmentRows) {
      const occurrence = (slotCounts[equipmentRow.slot] || 0) + 1;
      slotCounts[equipmentRow.slot] = occurrence;
      const slotKey = equipmentRow.slot === '戒指' ? `戒指${occurrence}` : equipmentRow.slot;
      selection[slotKey] = equipmentRow.item;
    }
    return selection;
  }

  function normalizedEquipmentName(equipmentName) {
    return equipmentName.replaceAll('·校服', '').replaceAll('校服', '');
  }

  function registerSavedEquipmentAliases(equipmentRows, equipmentByName, catalogBySlot) {
    for (const equipmentRow of equipmentRows) {
      if (equipmentByName.has(equipmentRow.item)) continue;
      const normalizedSavedName = normalizedEquipmentName(equipmentRow.item);
      const matchingEquipment = (catalogBySlot.get(equipmentRow.slot) || [])
        .find((equipment) => normalizedEquipmentName(equipment.name) === normalizedSavedName);
      if (matchingEquipment) equipmentByName.set(equipmentRow.item, matchingEquipment);
    }
  }

  function attributeTotals(selection, equipmentByName) {
    const totals = {};
    for (const equipmentName of Object.values(selection)) {
      const equipment = equipmentByName.get(equipmentName);
      if (!equipment) continue;
      for (const [attributeName, attributeAmount] of Object.entries(equipment.attributes)) {
        totals[attributeName] = (totals[attributeName] || 0) + Number(attributeAmount);
      }
    }
    return totals;
  }

  function attributeDifferences(selectedTotals, baselineTotals) {
    const attributeNames = new Set([...Object.keys(selectedTotals), ...Object.keys(baselineTotals)]);
    return Object.fromEntries(
      [...attributeNames]
        .map((attributeName) => [attributeName, (selectedTotals[attributeName] || 0) - (baselineTotals[attributeName] || 0)])
        .filter(([, difference]) => difference !== 0),
    );
  }

  function thresholdAt(hasteRows, hasteRating) {
    let activeThreshold = hasteRows[0];
    for (const hasteRow of hasteRows) {
      if (hasteRow['加速阈值'] > hasteRating) break;
      activeThreshold = hasteRow;
    }
    return activeThreshold;
  }

  function hasteDamageMultiplier(workbookData, attributeDelta) {
    const baselineHaste = Number(workbookData.main.stats['加速']);
    const selectedHaste = baselineHaste + (attributeDelta['加速'] || 0);
    const baselineThreshold = thresholdAt(workbookData.haste.regular, baselineHaste);
    const selectedThreshold = thresholdAt(workbookData.haste.regular, selectedHaste);
    const daiShare = workbookData.analysis.skills.find((skill) => skill.name === '玳弦急曲')?.value || 0.32;
    const daiMultiplier = baselineThreshold['0舞玳'] / selectedThreshold['0舞玳'];
    const globalMultiplier = baselineThreshold['公共CD'] / selectedThreshold['公共CD'];
    return daiShare * daiMultiplier + (1 - daiShare) * globalMultiplier;
  }

  function selectionSignature(selection) {
    return SLOT_LAYOUT.map((slotDefinition) => selection[slotDefinition.key] || '').join('|');
  }

  function dpsConsistency(cachedDps, formulaDps) {
    const cachedNumber = Number(cachedDps);
    const formulaNumber = Number(formulaDps);
    if (!Number.isFinite(cachedNumber) || !Number.isFinite(formulaNumber)) {
      return { isConsistent: false, relativeDifference: null };
    }
    const relativeDifference = Math.abs(formulaNumber - cachedNumber) / Math.max(1, Math.abs(cachedNumber));
    return { isConsistent: relativeDifference <= 1e-8, relativeDifference };
  }

  function createCalculator(workbookData) {
    const equipmentByName = new Map(workbookData.equipmentCatalog.map((equipment) => [equipment.name, equipment]));
    const catalogBySlot = new Map();
    const formulaWorkbook = new root.BingxinFormulaRuntime.FormulaWorkbook(root.BINGXIN_FORMULA_MODEL);
    const statReturnByName = new Map(workbookData.analysis.statReturns.map((statReturn) => [statReturn.name, statReturn]));
    const customizationFields = workbookData.customization?.fields || [];
    const baselineCustomization = { ...(workbookData.customization?.baseline || {}) };

    for (const equipment of workbookData.equipmentCatalog) {
      if (!catalogBySlot.has(equipment.slot)) catalogBySlot.set(equipment.slot, []);
      catalogBySlot.get(equipment.slot).push(equipment);
    }
    for (const equipmentList of catalogBySlot.values()) {
      equipmentList.sort((left, right) => right.itemLevel - left.itemLevel || left.name.localeCompare(right.name, 'zh-CN'));
    }

    workbookData.builds.forEach((build) => registerSavedEquipmentAliases(build.equipment, equipmentByName, catalogBySlot));
    const baselineSelection = equipmentSelection(workbookData.main.equipment);
    const baselineTotals = attributeTotals(baselineSelection, equipmentByName);
    const buildSelections = workbookData.builds.map((build) => equipmentSelection(build.equipment));
    const buildCustomizations = workbookData.builds.map((build) => ({ ...baselineCustomization, ...build.customization }));

    function normalizedCustomization(customization) {
      return Object.fromEntries(
        customizationFields.map((field) => [field.key, customization?.[field.key] ?? baselineCustomization[field.key]]),
      );
    }

    function configurationSignature(selection, customization) {
      const customizationValues = normalizedCustomization(customization);
      const enhancementSignature = customizationFields.map((field) => customizationValues[field.key] ?? '').join('|');
      return `${selectionSignature(selection)}||${enhancementSignature}`;
    }

    function customizationChanges(customization) {
      const customizationValues = normalizedCustomization(customization);
      return customizationFields.map((field) => ({
        sheet: '计算主页',
        address: field.address,
        value: customizationValues[field.key],
      }));
    }

    function dynamicSocketOptions(customization) {
      formulaWorkbook.setCells(customizationChanges(customization));
      const cells = {
        R12: [29, 30, 31, 32, 33],
        R13: [34, 35, 36, 37, 38, 39],
      };
      return Object.fromEntries(Object.entries(cells).map(([address, rows]) => [
        address,
        [...new Set(rows.map((row) => root.BingxinFormulaRuntime.scalar(formulaWorkbook.getCell('常更新数据', `S${row}`))).filter(Boolean))],
      ]));
    }

    function customizationFieldsFor(customization) {
      const socketOptions = dynamicSocketOptions(customization);
      return customizationFields.map((field) => ({
        ...field,
        options: socketOptions[field.address] || field.options,
      }));
    }

    function compatibleCustomization(customization) {
      const compatibleValues = normalizedCustomization(customization);
      for (const address of ['R12', 'R13']) {
        const field = customizationFieldsFor(compatibleValues).find((candidate) => candidate.address === address);
        if (!field.options.some((option) => option === compatibleValues[field.key])) {
          compatibleValues[field.key] = field.options[0];
        }
      }
      return compatibleValues;
    }

    const baselineSignature = configurationSignature(baselineSelection, baselineCustomization);
    const knownDpsBySignature = new Map([[baselineSignature, workbookData.main.mainDps]]);
    workbookData.builds.forEach((build, buildIndex) => {
      if (build.dps !== null && build.dps !== undefined) {
        knownDpsBySignature.set(configurationSignature(buildSelections[buildIndex], buildCustomizations[buildIndex]), build.dps);
      }
    });

    const pantsAdjustmentByName = calibratedPantsAdjustments({
      workbookData,
      baselineSelection,
      baselineTotals,
      equipmentByName,
      statReturnByName,
    });

    function damageAttributeMultiplier(attributeDelta) {
      return DAMAGE_ATTRIBUTES.reduce((multiplier, attributeName) => {
        const statReturn = statReturnByName.get(attributeName);
        const ratingDifference = attributeDelta[attributeName] || 0;
        if (!statReturn || !ratingDifference) return multiplier;
        return multiplier * Math.pow(1 + statReturn.value, ratingDifference / statReturn.unit);
      }, 1);
    }

    function estimatedCalculation(selection) {
      const selectedTotals = attributeTotals(selection, equipmentByName);
      const attributeDelta = attributeDifferences(selectedTotals, baselineTotals);
      const attributeMultiplier = damageAttributeMultiplier(attributeDelta);
      const speedMultiplier = hasteDamageMultiplier(workbookData, attributeDelta);
      const pantsAdjustment = pantsAdjustmentByName.get(selection['裤子']) || 1;
      const estimatedDps = workbookData.main.mainDps * attributeMultiplier * speedMultiplier * pantsAdjustment;
      return { dps: estimatedDps, attributeDelta };
    }

    function formulaChanges(selection, customization) {
      const equipmentChanges = SLOT_LAYOUT.map((slotDefinition) => {
        const selectedEquipment = equipmentByName.get(selection[slotDefinition.key]);
        return {
          sheet: '计算主页',
          address: FORMULA_INPUT_CELLS[slotDefinition.key],
          value: selectedEquipment?.name || selection[slotDefinition.key],
        };
      });
      return [...equipmentChanges, ...customizationChanges(customization)];
    }

    function calculate(selection, customization = baselineCustomization) {
      const estimate = estimatedCalculation(selection);
      const customizationValues = normalizedCustomization(customization);
      formulaWorkbook.setCells(formulaChanges(selection, customizationValues));
      const formulaOutputs = formulaWorkbook.getOutputs();
      const cachedDps = knownDpsBySignature.get(configurationSignature(selection, customizationValues));
      const hasCachedDps = cachedDps !== undefined;
      const consistency = hasCachedDps
        ? dpsConsistency(cachedDps, formulaOutputs.dps)
        : { isConsistent: true, relativeDifference: null };
      const displayedDps = hasCachedDps ? cachedDps : formulaOutputs.dps;
      const canCustomize = !hasCachedDps || consistency.isConsistent;
      let source = '完整公式重算';
      if (hasCachedDps) source = canCustomize ? '工作簿缓存值' : '工作簿缓存值（只读）';

      return {
        dps: displayedDps,
        change: displayedDps / workbookData.main.mainDps - 1,
        attributeDelta: estimate.attributeDelta,
        source,
        canCustomize,
        formulaDps: formulaOutputs.dps,
        cacheDifference: consistency.relativeDifference,
        selectedHaste: formulaOutputs.haste,
        outputs: formulaOutputs,
      };
    }

    function recommendations(slotKey, selection, customization = baselineCustomization) {
      const slotDefinition = SLOT_LAYOUT.find((slot) => slot.key === slotKey);
      if (!slotDefinition) return [];
      if (slotKey === '裤子' && configurationSignature(selection, customization) === baselineSignature) {
        return workbookData.recommendations.items.map((recommendation) => ({
          equipment: equipmentByName.get(recommendation.name),
          calculation: {
            dps: workbookData.main.mainDps * (1 + recommendation.value),
            change: recommendation.value,
            source: '工作簿缓存值',
          },
        })).filter((recommendation) => recommendation.equipment);
      }
      return (catalogBySlot.get(slotDefinition.catalogSlot) || [])
        .map((equipment) => {
          const candidateSelection = { ...selection, [slotKey]: equipment.name };
          const estimate = estimatedCalculation(candidateSelection);
          return {
            equipment,
            calculation: {
              dps: estimate.dps,
              change: estimate.dps / workbookData.main.mainDps - 1,
              source: '推荐排序预估',
            },
          };
        })
        .sort((left, right) => right.calculation.dps - left.calculation.dps);
    }

    return {
      slotLayout: SLOT_LAYOUT,
      baselineSelection,
      baselineCustomization,
      buildSelections,
      buildCustomizations,
      customizationFieldsFor,
      compatibleCustomization,
      catalogBySlot,
      equipmentByName,
      calculate,
      recommendations,
    };
  }

  function calibratedPantsAdjustments({
    workbookData,
    baselineSelection,
    baselineTotals,
    equipmentByName,
    statReturnByName,
  }) {
    const adjustments = new Map();
    const baselinePants = baselineSelection['裤子'];

    for (const recommendation of workbookData.recommendations.items) {
      const candidatePants = equipmentByName.get(recommendation.name);
      if (!candidatePants) continue;
      const candidateSelection = { ...baselineSelection, 裤子: candidatePants.name };
      const candidateTotals = attributeTotals(candidateSelection, equipmentByName);
      const attributeDelta = attributeDifferences(candidateTotals, baselineTotals);
      const marginalMultiplier = DAMAGE_ATTRIBUTES.reduce((multiplier, attributeName) => {
        const statReturn = statReturnByName.get(attributeName);
        const ratingDifference = attributeDelta[attributeName] || 0;
        if (!statReturn || !ratingDifference) return multiplier;
        return multiplier * Math.pow(1 + statReturn.value, ratingDifference / statReturn.unit);
      }, 1);
      const speedMultiplier = hasteDamageMultiplier(workbookData, attributeDelta);
      adjustments.set(candidatePants.name, (1 + recommendation.value) / (marginalMultiplier * speedMultiplier));
    }
    adjustments.set(baselinePants, 1);
    return adjustments;
  }

  root.BingxinCalculator = { createCalculator };
})(typeof window === 'undefined' ? globalThis : window);
