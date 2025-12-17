// 任务相关的类型定义

export interface MergeRange {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

export interface ExcelStructure {
  taskNameRow: number;
  taskNumberRow: number;
  taskTypeRow: number;
  dataStructureRow: number;
  samplingBaseTimeRow: number;
  samplingPeriodRow: number;
  samplingPeriodUnitRow: number;
  reportBaseTimeRow: number;
  reportPeriodRow: number;
  reportPeriodUnitRow: number;
  extractionRatioRow: number;
  measurementPointRow: number;
  executionCountRow: number;
  dataItemsRow: number;
  taskMappingStartRow: number;
  measurementRangeColumn: number;
  isSingleTaskMode: boolean;
  isMultiRowMode: boolean;  // 新增：是否为多行模式（测量点号包含中文描述）
}

export interface MeasurementRange {
  rowIndex: number;
  range: string;
}

export interface TaskInfo {
  taskName: string;
  taskType: string;
  dataStructureType: number | null;
  dataStructureTypeOriginal: string;
  samplingBaseTime: string;
  samplingBaseTimeOriginal: string;
  samplingPeriod: number | null;
  samplingPeriodOriginal: string;
  samplingPeriodUnit: number | null;
  samplingPeriodUnitOriginal: string;
  reportBaseTime: string;
  reportBaseTimeOriginal: string;
  reportPeriod: number | null;
  reportPeriodOriginal: string;
  reportPeriodUnit: number | null;
  reportPeriodUnitOriginal: string;
  extractionRatio: number | null;
  extractionRatioOriginal: string;
  measurementPointId: string;
  executionCount: string;
  dataItems: Record<string, string>;
  dataItemsOriginal: string;
  taskParam: string;
}

export interface Task extends TaskInfo {
  worksheet: string;
  columnIndex: number;
  taskNumber: number;
  measurementPoints: string;
  parsedMeasurementPoints: number[];
  measurementPointsCount: number;
}

export interface Stats {
  totalSheets: number;
  sheetNames: string[];
  totalTasks: number;
  tasksBySheet: Record<string, number>;
}

export interface SearchFilters {
  filters: Record<string, string[]>;
  generalTerms: string[];
}