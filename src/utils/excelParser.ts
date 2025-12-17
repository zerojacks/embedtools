import { ExcelStructure, MergeRange, MeasurementRange } from '@/types/task';

/**
 * 填充合并单元格
 */
export const fillMergedCells = (data: any[][], merges: MergeRange[]): any[][] => {
  // 创建数据副本
  const filledData = data.map(row => [...row]);

  // 遍历所有合并单元格区域
  for (const merge of merges) {
    const { s, e } = merge; // s: start, e: end

    // 获取合并区域左上角单元格的值
    const value = filledData[s.r] && filledData[s.r][s.c]
      ? filledData[s.r][s.c]
      : '';

    // 将值填充到整个合并区域
    for (let row = s.r; row <= e.r; row++) {
      for (let col = s.c; col <= e.c; col++) {
        if (!filledData[row]) {
          filledData[row] = [];
        }
        filledData[row][col] = value;
      }
    }
  }

  return filledData;
};

/**
 * 检查单个列是否为多行模式（包含中文描述）
 */
export const isColumnMultiRowMode = (data: any[][], measurementPointRow: number, col: number): boolean => {
  if (measurementPointRow === -1 || !data[measurementPointRow] || col === 0) return false;
  
  const cellValue = String(data[measurementPointRow][col] || '').trim();
  if (!cellValue) return false;
  
  // 检查是否包含中文字符（排除纯数字和简单的范围表示）
  const hasChinese = /[\u4e00-\u9fff]/.test(cellValue);
  const isSimpleRange = /^[\d\-,，\s]+$/.test(cellValue);
  
  return hasChinese && !isSimpleRange;
};

/**
 * 检查测量点号行是否包含中文描述（需要多行模式）
 */
export const hasMeasurementPointChineseDescription = (data: any[][], measurementPointRow: number): boolean => {
  if (measurementPointRow === -1 || !data[measurementPointRow]) return false;
  
  const row = data[measurementPointRow];
  
  // 检查该行是否包含中文字符（除了"测量点号"这个标签本身）
  for (let col = 1; col < row.length; col++) {
    if (isColumnMultiRowMode(data, measurementPointRow, col)) {
      return true;
    }
  }
  
  return false;
};

/**
 * 智能识别Excel结构
 */
export const analyzeExcelStructure = (data: any[][]): ExcelStructure => {
  const structure: ExcelStructure = {
    taskNameRow: -1,
    taskNumberRow: -1,
    taskTypeRow: -1,
    dataStructureRow: -1,
    samplingBaseTimeRow: -1,
    samplingPeriodRow: -1,
    samplingPeriodUnitRow: -1,
    reportBaseTimeRow: -1,
    reportPeriodRow: -1,
    reportPeriodUnitRow: -1,
    extractionRatioRow: -1,
    measurementPointRow: -1,
    executionCountRow: -1,
    dataItemsRow: -1,
    taskMappingStartRow: -1,
    measurementRangeColumn: 0,
    isSingleTaskMode: false,
    isMultiRowMode: false
  };

  // 遍历前40行查找关键字段
  for (let i = 0; i < Math.min(40, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').trim();

    // 匹配各个字段行
    if (firstCell.includes('任务名称') || (firstCell.includes('测量点号') && firstCell.includes('任务名称'))) {
      structure.taskNameRow = i;
      // 对于集中器任务.xlsx这种格式，任务名称行同时也是测量点号行
      if (firstCell.includes('测量点号')) {
        structure.measurementPointRow = i;
      }
    }
    if (firstCell.includes('任务号') && firstCell === '任务号') {
      structure.taskNumberRow = i;
    }
    if (firstCell.includes('任务类型') || firstCell === '任务类型') {
      structure.taskTypeRow = i;
    }
    if (firstCell.includes('数据结构方式') || firstCell.includes('数据格式') || firstCell.includes('是否有效')) {
      structure.dataStructureRow = i;
    }
    if (firstCell.includes('采样基准时间')) {
      structure.samplingBaseTimeRow = i;
    }
    if (firstCell.includes('定时采样周期') && !firstCell.includes('单位')) {
      structure.samplingPeriodRow = i;
    }
    if (firstCell.includes('定时采样周期单位') || firstCell.includes('采样周期单位')) {
      structure.samplingPeriodUnitRow = i;
    }
    if (firstCell.includes('上报基准时间')) {
      structure.reportBaseTimeRow = i;
    }
    if (firstCell.includes('定时上报周期') && !firstCell.includes('单位')) {
      structure.reportPeriodRow = i;
    }
    if (firstCell.includes('定时上报周期单位') || firstCell.includes('上报周期单位')) {
      structure.reportPeriodUnitRow = i;
    }
    if (firstCell.includes('数据抽取倍率')) {
      structure.extractionRatioRow = i;
    }
    if (firstCell.includes('测量点号') && structure.measurementPointRow === -1) {
      structure.measurementPointRow = i;
    }
    if (firstCell.includes('执行次数')) {
      structure.executionCountRow = i;
    }
    if (firstCell.includes('数据项') || firstCell.includes('数据源')) {
      structure.dataItemsRow = i;
    }
  }

  // 特殊处理：查找任务号映射表开始位置
  // 需要找到第二个"测量点号"区域（底部的任务分配区域）
  let measurementPointCount = 0;
  for (let i = 0; i < Math.min(50, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;

    const firstCell = String(row[0] || '').trim();
    
    // 统计"测量点号"出现次数
    if (firstCell === '测量点号') {
      measurementPointCount++;
      
      // 如果是第二个"测量点号"，这里就是任务分配区域的开始
      if (measurementPointCount === 2) {
        console.log(`找到第二个测量点号区域，行号: ${i}`);
        
        // 从下一行开始查找实际的测量点分配数据
        for (let j = i + 1; j < data.length; j++) {
          const dataRow = data[j];
          if (!dataRow || dataRow.length === 0) continue;
          
          const dataFirstCell = String(dataRow[0] || '').trim();
          // 找到第一个包含测量点标识的行（如"测量点0", "测量点1"等）
          if (dataFirstCell && (dataFirstCell.includes('测量点') || /^\d+\-\d+$/.test(dataFirstCell) || /^\d+$/.test(dataFirstCell))) {
            structure.taskMappingStartRow = j;
            console.log(`找到任务映射开始行: ${j}, 内容: ${dataFirstCell}`);
            break;
          }
        }
        break;
      }
      
      // 如果是第一个"测量点号"但后面跟着任务号列，也可能是任务分配区域
      if (measurementPointCount === 1 && row[1] && String(row[1]).trim() === '任务号') {
        // 从下一行开始查找实际数据
        for (let j = i + 1; j < data.length; j++) {
          const dataRow = data[j];
          if (!dataRow || dataRow.length === 0) continue;
          
          const dataFirstCell = String(dataRow[0] || '').trim();
          // 找到第一个包含测量点范围的行
          if (dataFirstCell && (/^\d+\-\d+$/.test(dataFirstCell) || /^\d+$/.test(dataFirstCell))) {
            structure.taskMappingStartRow = j;
            console.log(`找到任务映射开始行（第一种模式): ${j}, 内容: ${dataFirstCell}`);
            break;
          }
        }
        break;
      }
    }
  }

  // 如果还没找到任务映射表，使用原来的逻辑
  if (structure.taskMappingStartRow === -1) {
    for (let i = 0; i < Math.min(40, data.length); i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;
      
      const firstCell = String(row[0] || '').trim();
      
      if ((firstCell.includes('测量点') || firstCell.includes('类别') || /^\d/.test(firstCell)) && structure.taskMappingStartRow === -1) {
        // 检查该行后面的单元格是否包含数字（任务号）
        let hasNumbers = false;
        for (let j = 1; j < Math.min(5, row.length); j++) {
          const val = String(row[j] || '').trim();
          if (val && !isNaN(Number(val)) && val !== '0') {
            hasNumbers = true;
            break;
          }
        }
        if (hasNumbers) {
          structure.taskMappingStartRow = i;
          break;
        }
      }
    }
  }

  // 判断是否为单任务模式
  const hasBasicTaskInfo = structure.taskNameRow !== -1 || structure.taskTypeRow !== -1;
  const hasTaskMappingTable = structure.taskMappingStartRow !== -1;
  const hasTaskNumberRow = structure.taskNumberRow !== -1;

  // 对于集中器任务.xlsx这种多任务格式，不应该被识别为单任务模式
  if (hasBasicTaskInfo && hasTaskMappingTable && !hasTaskNumberRow) {
    structure.isSingleTaskMode = false; // 明确设置为多任务模式
  } else if (hasBasicTaskInfo && (!hasTaskMappingTable || hasTaskNumberRow)) {
    structure.isSingleTaskMode = true;
    if (!hasTaskMappingTable) {
      structure.taskMappingStartRow = -2; // 使用-2标记单任务无映射表模式
    }
  }

  // 判断是否需要多行模式（测量点号包含中文描述）
  if (structure.measurementPointRow !== -1) {
    structure.isMultiRowMode = hasMeasurementPointChineseDescription(data, structure.measurementPointRow);
  }

  return structure;
};

/**
 * 提取测量点范围列表
 */
export const extractMeasurementRanges = (data: any[][], startRow: number): MeasurementRange[] => {
  const ranges = [];

  for (let i = startRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) break;

    const rangeLabel = String(row[0] || '').trim();

    // 遇到空行或说明行则停止
    if (!rangeLabel) break;
    if (rangeLabel.includes('说明') || rangeLabel.includes('注') || rangeLabel.includes('备注')) {
      break;
    }

    ranges.push({
      rowIndex: i,
      range: rangeLabel
    });
  }

  return ranges;
};

/**
 * 多行模式：从测量点号行提取测量点描述，并从数据行提取实际的测量点范围
 * 当测量点号行包含中文描述时，需要从数据行中提取实际的测量点范围
 */
export const extractMeasurementPointsFromMultiRow = (
  data: any[][], 
  measurementPointRow: number, 
  taskMappingStartRow: number
): MeasurementRange[] => {
  const ranges: MeasurementRange[] = [];
  
  if (measurementPointRow === -1 || !data[measurementPointRow]) {
    return ranges;
  }

  // 在多行模式下，我们需要从数据行中提取实际的测量点范围
  // 而不是从测量点号行的描述
  
  // 查找任务号行的位置
  let taskNumberRowIndex = -1;
  for (let row = measurementPointRow + 1; row < Math.min(measurementPointRow + 10, data.length); row++) {
    const firstCell = String(data[row]?.[0] || '').trim();
    if (firstCell.includes('任务号') || firstCell === '任务号') {
      taskNumberRowIndex = row;
      break;
    }
  }
  
  // 如果没有找到专门的任务号行，查找第一个包含数字的行
  if (taskNumberRowIndex === -1) {
    for (let row = measurementPointRow + 1; row < Math.min(measurementPointRow + 10, data.length); row++) {
      if (data[row] && data[row][1]) {
        const cellValue = String(data[row][1] || '').trim();
        if (cellValue && !isNaN(Number(cellValue)) && cellValue !== '0') {
          taskNumberRowIndex = row;
          break;
        }
      }
    }
  }
  
  // 从任务号行的下一行开始提取实际的测量点范围
  const dataStartRow = taskNumberRowIndex !== -1 ? taskNumberRowIndex + 1 : measurementPointRow + 2;
  
  for (let i = dataStartRow; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) break;

    const rangeLabel = String(row[0] || '').trim();

    // 遇到空行或说明行则停止
    if (!rangeLabel) break;
    if (rangeLabel.includes('说明') || rangeLabel.includes('注') || rangeLabel.includes('备注')) {
      break;
    }

    ranges.push({
      rowIndex: i,
      range: rangeLabel
    });
  }
  
  return ranges;
};

/**
 * 按列提取测量点范围（混合模式支持）
 * 每一列独立判断是多行模式还是标准模式
 */
export const extractMeasurementRangesByColumn = (
  data: any[][], 
  structure: ExcelStructure,
  col: number
): MeasurementRange[] => {
  const ranges: MeasurementRange[] = [];
  
  // 判断这一列是否为多行模式
  const isMultiRow = isColumnMultiRowMode(data, structure.measurementPointRow, col);
  
  console.log(`列 ${col} 模式: ${isMultiRow ? '多行模式' : '标准模式'}`);
  
  if (isMultiRow && structure.measurementPointRow !== -1) {
    // 多行模式：从测量点号行的描述作为范围标识
    const cellValue = String(data[structure.measurementPointRow][col] || '').trim();
    if (cellValue) {
      ranges.push({
        rowIndex: structure.measurementPointRow,
        range: cellValue
      });
    }
  } else {
    // 标准模式：从任务映射表中提取实际的测量点范围
    if (structure.taskMappingStartRow !== -1) {
      for (let i = structure.taskMappingStartRow; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) break;

        const rangeLabel = String(row[0] || '').trim();
        
        // 遇到空行或说明行则停止
        if (!rangeLabel) break;
        if (rangeLabel.includes('说明') || rangeLabel.includes('注') || rangeLabel.includes('备注')) {
          break;
        }

        // 检查这一列是否有数据（任务号或标记）
        const colValue = String(row[col] || '').trim();
        if (colValue && colValue !== '0' && colValue !== '') {
          ranges.push({
            rowIndex: i,
            range: rangeLabel
          });
        }
      }
    }
  }
  
  return ranges;
};

/**
 * 智能提取测量点范围（支持多行模式）
 */
export const extractMeasurementRangesIntelligent = (
  data: any[][], 
  structure: ExcelStructure
): MeasurementRange[] => {
  if (structure.isMultiRowMode && structure.measurementPointRow !== -1) {
    // 多行模式：从测量点号行提取
    console.log('使用多行模式提取测量点范围');
    return extractMeasurementPointsFromMultiRow(
      data, 
      structure.measurementPointRow, 
      structure.taskMappingStartRow
    );
  } else if (structure.taskMappingStartRow !== -1) {
    // 标准模式：从任务映射表开始行提取
    console.log('使用标准模式提取测量点范围');
    return extractMeasurementRanges(data, structure.taskMappingStartRow);
  }
  
  return [];
};