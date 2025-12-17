import { TaskInfo, ExcelStructure } from '@/types/task';
import { 
  parseDataStructureType, 
  parsePeriodValue, 
  parsePeriodUnit, 
  parseExtractionRatio, 
  parseTimeFormat, 
  parseDataItems 
} from './dataParser';

/**
 * 获取测量点号信息
 */
const getMeasurementPointId = (
  data: any[][], 
  colIndex: number, 
  structure: ExcelStructure
): string => {
  // 查找真正的测量点号行（不是任务名称行）
  for (let i = 0; i < Math.min(20, data.length); i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    const firstCell = String(row[0] || '').trim();
    
    // 找到单独的"测量点号"行（不包含"任务名称"）
    if (firstCell === '测量点号' && i !== structure.taskNameRow) {
      const value = String(row[colIndex] || '').trim();
      if (value && value !== '测量点号') {
        return value;
      }
    }
  }
  
  // 如果没找到，返回空字符串
  return '';
};

/**
 * 从指定列提取任务信息
 */
export const extractTaskFromColumn = (
  data: any[][], 
  colIndex: number, 
  structure: ExcelStructure
): TaskInfo => {
  const getValue = (rowIndex: number): string => {
    if (rowIndex === -1 || !data[rowIndex]) return '';
    return String(data[rowIndex][colIndex] || '').trim();
  };

  // 获取任务名称
  let taskName = '';
  // 首先尝试从任务名称行获取
  if (structure.taskNameRow !== -1) {
    taskName = getValue(structure.taskNameRow);
    // 如果获取到的是标题行内容（包含"任务名称"），则跳过
    if (taskName.includes('任务名称') || taskName.includes('测量点号')) {
      taskName = '';
    }
  }
  // 如果任务名称行没找到，尝试从任务类型行之前找
  if (!taskName && structure.taskTypeRow !== -1) {
    for (let i = structure.taskTypeRow - 1; i >= 0; i--) {
      const val = getValue(i);
      if (val && val !== '任务名称' && !val.includes('集中器') && !val.includes('模板') && !val.includes('测量点号')) {
        taskName = val;
        break;
      }
    }
  }
  // 如果还是没找到，尝试从第一行或第二行获取
  if (!taskName) {
    const val0 = getValue(0);
    const val1 = getValue(1);
    if (val0 && !val0.includes('集中器') && !val0.includes('模板') && !val0.includes('任务名称') && !val0.includes('测量点号')) {
      taskName = val0;
    } else if (val1 && !val1.includes('集中器') && !val1.includes('模板') && !val1.includes('任务名称') && !val1.includes('测量点号')) {
      taskName = val1;
    }
  }

  // 获取原始值
  const rawDataStructure = getValue(structure.dataStructureRow);
  const rawSamplingPeriod = getValue(structure.samplingPeriodRow);
  const rawSamplingUnit = getValue(structure.samplingPeriodUnitRow);
  const rawReportPeriod = getValue(structure.reportPeriodRow);
  const rawReportUnit = getValue(structure.reportPeriodUnitRow);
  const rawExtractionRatio = getValue(structure.extractionRatioRow);
  const rawDataItems = getValue(structure.dataItemsRow);

  // 获取时间相关的原始值
  const rawSamplingBaseTime = getValue(structure.samplingBaseTimeRow);
  const rawReportBaseTime = getValue(structure.reportBaseTimeRow);

  const taskInfo: TaskInfo = {
    taskName: taskName,
    taskType: getValue(structure.taskTypeRow),
    dataStructureType: parseDataStructureType(rawDataStructure),
    dataStructureTypeOriginal: rawDataStructure,
    samplingBaseTime: parseTimeFormat(rawSamplingBaseTime),
    samplingBaseTimeOriginal: rawSamplingBaseTime,
    samplingPeriod: parsePeriodValue(rawSamplingPeriod),
    samplingPeriodOriginal: rawSamplingPeriod,
    samplingPeriodUnit: parsePeriodUnit(rawSamplingUnit),
    samplingPeriodUnitOriginal: rawSamplingUnit,
    reportBaseTime: parseTimeFormat(rawReportBaseTime),
    reportBaseTimeOriginal: rawReportBaseTime,
    reportPeriod: parsePeriodValue(rawReportPeriod),
    reportPeriodOriginal: rawReportPeriod,
    reportPeriodUnit: parsePeriodUnit(rawReportUnit),
    reportPeriodUnitOriginal: rawReportUnit,
    extractionRatio: parseExtractionRatio(rawExtractionRatio),
    extractionRatioOriginal: rawExtractionRatio,
    measurementPointId: getMeasurementPointId(data, colIndex, structure),
    executionCount: getValue(structure.executionCountRow),
    dataItems: parseDataItems(rawDataItems),
    dataItemsOriginal: rawDataItems,
    taskParam: ""
  };
  
  return taskInfo;
};