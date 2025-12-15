import React, { useState } from 'react';
import { Upload, FileText, Download, Search, AlertCircle, CheckCircle, Info, X } from 'lucide-react';
import * as XLSX from 'xlsx';

// 类型定义
interface MergeRange {
  s: { r: number; c: number };
  e: { r: number; c: number };
}

interface ExcelStructure {
  taskNameRow: number;
  taskNumberRow: number;  // 新增：任务号行
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
  isSingleTaskMode: boolean;  // 新增：是否为单任务模式标志
}

interface MeasurementRange {
  rowIndex: number;
  range: string;
}

interface TaskInfo {
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

interface Task extends TaskInfo {
  worksheet: string;
  columnIndex: number;
  taskNumber: number;
  measurementPoints: string;
  parsedMeasurementPoints: number[]; // 解析后的测量点数组
  measurementPointsCount: number;    // 测量点总数
}

interface Stats {
  totalSheets: number;
  sheetNames: string[];
  totalTasks: number;
  tasksBySheet: Record<string, number>;
}

interface InfoItemProps {
  label: string;
  value: string | number | null;
  originalValue?: string;
  highlight?: boolean;
}

interface TaskDetailProps {
  task: Task;
  expandedMeasurementPoints: Set<string>;
  setExpandedMeasurementPoints: (expanded: Set<string>) => void;
  showCheckbox?: boolean;
  selectedTasks?: Set<string>;
  toggleTaskSelection?: (task: Task) => void;
  getTaskKey?: (task: Task) => string;
}

const TaskExtractor = () => {
  const [extractedData, setExtractedData] = useState<Record<string, Task[]>>({});
  const [fileName, setFileName] = useState<string>('');
  const [searchText, setSearchText] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [selectedSheet, setSelectedSheet] = useState<string>('all');
  const [expandedMeasurementPoints, setExpandedMeasurementPoints] = useState<Set<string>>(new Set());
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());
  const [selectedTaskDetail, setSelectedTaskDetail] = useState<Task | null>(null);
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  // 填充合并单元格
  const fillMergedCells = (data: any[][], merges: MergeRange[]): any[][] => {
    // 创建数据副本
    const filledData = data.map(row => [...row]);

    // 遍历所有合并单元格区域
    for (const merge of merges) {
      const { s, e } = merge; // s: start, e: end
      // s.r: 起始行, s.c: 起始列
      // e.r: 结束行, e.c: 结束列

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

  // 智能识别Excel结构
  const analyzeExcelStructure = (data: any[][]): ExcelStructure => {
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
      isSingleTaskMode: false
    };

    // 遍历前40行查找关键字段
    for (let i = 0; i < Math.min(40, data.length); i++) {
      const row = data[i];
      if (!row || row.length === 0) continue;

      const firstCell = String(row[0] || '').trim();

      // 匹配各个字段行
      if (firstCell.includes('任务名称') || firstCell === '任务名称') {
        structure.taskNameRow = i;
      }
      if (firstCell.includes('任务号') || firstCell === '任务号') {
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

      // 查找任务号映射表开始位置 - 多种匹配方式
      // 方式1: "测量点号" + "任务号"
      if (firstCell.includes('测量点号') && !firstCell.includes("备注") && row[1] && (String(row[1]).includes('任务号') || String(row[1]).includes('负荷'))) {
        structure.taskMappingStartRow = i + 1;
      }
      // 方式2: 行标签包含"测量点"、"类别"等
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
        }
      }
    }

    // 判断是否为单任务模式
    // 条件1: 找到了基本任务信息字段（任务名称、任务类型等）
    // 条件2: 没有找到任务映射表，或者找到了任务号行（单任务模式特征）
    const hasBasicTaskInfo = structure.taskNameRow !== -1 || structure.taskTypeRow !== -1;
    const hasTaskMappingTable = structure.taskMappingStartRow !== -1;
    const hasTaskNumberRow = structure.taskNumberRow !== -1;

    if (hasBasicTaskInfo && (!hasTaskMappingTable || hasTaskNumberRow)) {
      structure.isSingleTaskMode = true;
      // 对于单任务模板，如果没有映射表，设置标记
      if (!hasTaskMappingTable) {
        structure.taskMappingStartRow = -2; // 使用-2标记单任务无映射表模式
      }
    }

    return structure;
  };

  // 提取测量点范围列表
  const extractMeasurementRanges = (data: any[][], startRow: number): MeasurementRange[] => {
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

      // 支持多种格式的范围标签
      // 格式1: "1-50", "51-100" 等
      // 格式2: "型国志0", "型国志1" 等
      // 格式3: "0", "1", "2" 等纯数字
      ranges.push({
        rowIndex: i,
        range: rangeLabel
      });
    }

    return ranges;
  };

  // 处理数据结构方式
  const parseDataStructureType = (value: string): number | null => {
    if (!value) return null;

    // 匹配 "数字：描述" 格式
    const match = value.match(/^(\d+)[：:]/);
    if (match) {
      return parseInt(match[1]);
    }

    // 根据描述内容转换
    if (value.includes('自描述')) return 0;

    return null;
  };

  // 处理周期数值（采样周期、上报周期）
  const parsePeriodValue = (value: string): number | null => {
    if (!value) return null;

    // 提取数字部分
    const match = value.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }

    return null;
  };

  // 处理周期单位
  const parsePeriodUnit = (value: string): number | null => {
    if (!value) return null;

    // 匹配 "数字：类型" 格式
    const match = value.match(/^(\d+)[：:]/);
    if (match) {
      return parseInt(match[1]);
    }

    // 根据内容转换 [0:分,1:小时/时,2:日,3:月]
    const lowerValue = value.toLowerCase();
    if (lowerValue.includes('分')) return 0;
    if (lowerValue.includes('小时') || lowerValue.includes('时')) return 1;
    if (lowerValue.includes('日')) return 2;
    if (lowerValue.includes('月')) return 3;

    return null;
  };

  // 处理数据抽取倍率
  const parseExtractionRatio = (value: string): number | null => {
    if (!value) return null;

    const match = value.match(/(\d+)/);
    if (match) {
      return parseInt(match[1]);
    }

    return null;
  };

  // 处理时间格式 - 转换为YYMMDDhhmm格式（10位）
  const parseTimeFormat = (value: string): string => {
    if (!value) return '';

    // 提取数字部分
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';

    // 根据长度判断格式并转换
    switch (digits.length) {
      case 10: // YYMMDDhhmm - 已是目标格式
        return digits;

      case 12: // YYYYMMDDhhmm - 需要去掉世纪部分
        return digits.substring(2);

      case 14: // YYYYMMDDhhmmss - 需要去掉世纪部分和秒部分
        return digits.substring(2, 12);

      case 8: // YYMMDDhh - 补充分钟为00
        return digits + '00';

      case 6: // YYMMDD - 补充时分为0000
        return digits + '0000';

      case 4: // YYMM - 补充日时分为010000
        return digits + '010000';

      default:
        // 尝试智能解析其他长度
        if (digits.length >= 12) {
          // 长度>=12，假设包含世纪，去掉世纪和可能的秒
          const withoutCentury = digits.substring(2);
          return withoutCentury.length >= 10 ? withoutCentury.substring(0, 10) : withoutCentury;
        } else if (digits.length >= 6) {
          // 长度6-11，补充缺失部分
          const padded = digits.padEnd(10, '0');
          return padded.substring(0, 10);
        } else {
          // 长度<6，可能格式不正确，返回原值
          return digits;
        }
    }
  };

  // 转换函数 - 将Python的toDA函数转换为TypeScript
  const toDA = (iVal: number): [number, number] => {
    if (iVal === 0xFFFF) return [0xFF, 0xFF];
    const low = (iVal - 1) % 8;
    const high = Math.floor((iVal - 1) / 8); // 使用Math.floor进行整数除法
    let mask = 0;
    let ret = 0;
    mask = 1;

    if (iVal === 0) {
      ret = 0;
    } else {
      ret = (high + 1) << 8;
      let lowCopy = low;
      while (lowCopy > 0) {
        mask <<= 1;
        lowCopy -= 1;
      }
      ret |= mask;
    }

    const da1 = ret & 0x00ff;
    const da2 = ret >> 8;

    return [da1, da2];
  };

  // 16进制转BCD函数
  const hexToBcd = (hexValue: number): number => {
    // 将16进制数转换为BCD码
    // 例如：0x23 -> 0x23 (BCD), 0x1A -> 0x10 (BCD)
    if (hexValue > 99) {
      // 如果超过99，取模100
      hexValue = hexValue % 100;
    }

    const tens = Math.floor(hexValue / 10);
    const units = hexValue % 10;

    // BCD编码：十位数字在高4位，个位数字在低4位
    return (tens << 4) | units;
  };

  // 时间字符串转BCD字节数组函数
  const timeToBcdBytes = (timeStr: string): number[] => {
    if (!timeStr || timeStr.length < 10) {
      return [0, 0, 0, 0, 0]; // 默认5字节全0
    }

    const bcdBytes: number[] = [];

    // YYMMDDhhmm 格式，每2位转换为一个BCD字节
    for (let i = 0; i < 10; i += 2) {
      const twoDigits = parseInt(timeStr.substring(i, i + 2), 10);
      const bcdByte = hexToBcd(twoDigits);
      bcdBytes.push(bcdByte);
    }

    return bcdBytes;
  };

  // 解析测量点标识，支持多种格式
  const parseMeasurementPoints = (pointStr: string): number[] => {
    const points: number[] = [];

    if (!pointStr) return [1]; // 默认返回测量点1

    // 按逗号分割多个测量点范围
    const ranges = pointStr.split(/[,，]/).map(s => s.trim());

    for (const range of ranges) {
      if (!range) continue;

      // 提取数字部分，支持"测量点2"这样的格式
      const cleanRange = range.replace(/[^\d\-]/g, '');

      if (cleanRange.includes('-')) {
        // 处理范围格式，如"251-300"
        const [startStr, endStr] = cleanRange.split('-');
        const start = parseInt(startStr);
        const end = parseInt(endStr);

        if (!isNaN(start) && !isNaN(end) && start <= end) {
          // 展开范围内的所有点
          for (let i = start; i <= end; i++) {
            points.push(i);
          }
        }
      } else {
        // 处理单个数字
        const point = parseInt(cleanRange);
        if (!isNaN(point)) {
          points.push(point);
        }
      }
    }

    // 去重并排序
    return Array.from(new Set(points)).sort((a, b) => a - b);
  };

  // 处理数据项信息 - 4字节16进制数据标识（8个字符）
  const parseDataItems = (value: string): Record<string, string> => {
    if (!value) return {};

    const dataItems: Record<string, string> = {};

    // 方法1: 匹配标准格式 E1008030（上日）停电总次数、E1008031（上日）停电总时间
    const standardRegex = /([A-Fa-f0-9]{8})[（(][^)）]*[)）]([^、,，；;]+)/g;
    let match;
    while ((match = standardRegex.exec(value)) !== null) {
      const hexId = match[1].toUpperCase();
      const name = match[2].trim();
      dataItems[hexId] = name;
    }

    // 方法2: 智能解析 - 先检测格式类型，再应用相应策略
    if (Object.keys(dataItems).length === 0) {
      // 检测是否包含分号分隔的段落格式
      const hasSegments = /[；;]/.test(value);

      if (hasSegments) {
        // 格式类型A: 段落格式 - 020A01FF、020A02FF、020A03FF 描述；020B01FF、020B02FF、020B03FF 描述
        const segments = value.split(/[；;]/);

        for (const segment of segments) {
          const trimmedSegment = segment.trim();
          if (!trimmedSegment) continue;

          // 在每个段落中查找所有16进制标识
          const hexIds: string[] = [];
          const hexRegex = /([A-Fa-f0-9]{6,8})(?![A-Fa-f0-9])/g;
          let hexMatch;
          while ((hexMatch = hexRegex.exec(trimmedSegment)) !== null) {
            // 确保是8位，不足8位的前面补0
            const paddedHex = hexMatch[1].padStart(8, '0').toUpperCase();
            hexIds.push(paddedHex);
          }

          if (hexIds.length > 0) {
            // 提取该段落的描述（去掉所有16进制标识后的内容）
            let description = trimmedSegment
              .replace(/[A-Fa-f0-9]{6,8}(?![A-Fa-f0-9])/g, '') // 移除16进制标识
              .replace(/^[\s、,，\u3000]+/, '') // 移除开头的分隔符和空格
              .replace(/[\s、,，\u3000]+$/, '') // 移除结尾的分隔符和空格
              .trim();

            // 为该段落中的所有16进制标识分配相同的描述
            if (description) {
              for (const hexId of hexIds) {
                dataItems[hexId] = description;
              }
            }
          }
        }
      } else {
        // 格式类型B: 连续格式 - 02010100 A相电压、02010200 B相电压、02010300 C相电压
        // 使用分割方法：先按分隔符分割，再从每个片段中提取数据标识和描述

        // 按常见分隔符分割成独立的项目
        const items = value.split(/[、,，；;]/);

        for (const item of items) {
          const trimmedItem = item.trim();
          if (!trimmedItem) continue;

          // 在每个项目中查找16进制标识
          let hexId = '';
          let description = '';
          
          // 方法1: 匹配标准格式 "02010100 A相电压"（8位16进制 + 空格 + 描述）
          let match = trimmedItem.match(/^([0-9A-Fa-f]{8})\s+(.+)$/);
          if (match) {
            hexId = match[1].toUpperCase();
            description = match[2];
          } else {
            // 方法2: 匹配连在一起的格式 "02030300C相有功功率"
            // 先尝试匹配8位纯数字 + 中文（处理 "02030300C相有功功率" 中的前8位数字）
            match = trimmedItem.match(/^([0-9]{8})([A-Za-z\u4e00-\u9fff].*)$/);
            if (match) {
              hexId = match[1].toUpperCase();
              description = match[2];
            } else {
              // 方法3: 匹配7位数字 + 字母开头的描述（如 "2030300C相有功功率"）
              match = trimmedItem.match(/^([0-9]{7})[A-Fa-f]([A-Za-z\u4e00-\u9fff].*)$/);
              if (match) {
                hexId = ('0' + match[1]).toUpperCase(); // 前面补0变成8位
                description = match[2];
              } else {
                // 方法4: 通用匹配6-8位16进制 + 非16进制字符
                match = trimmedItem.match(/^([0-9A-Fa-f]{6,8})([^0-9A-Fa-f].*)$/);
                if (match) {
                  hexId = match[1].padStart(8, '0').toUpperCase();
                  description = match[2];
                }
              }
            }
          }
          
          if (hexId && description) {

            // 清理描述文本开头和结尾的空格和符号
            description = description.replace(/^[\s、,，：:\-\—\–\u3000]+/, '');
            description = description.replace(/[\s、,，：:\-\—\–\u3000]+$/, '');

            if (description) {
              dataItems[hexId] = description;
            }
          }
        }

        // 如果上面的方法没有匹配到，使用原来的方法作为fallback
        if (Object.keys(dataItems).length === 0) {
          const hexMatches: Array<{ id: string, start: number, end: number }> = [];
          const hexRegex = /([A-Fa-f0-9]{6,8})(?![A-Fa-f0-9])/g;
          let hexMatch;

          while ((hexMatch = hexRegex.exec(value)) !== null) {
            hexMatches.push({
              id: hexMatch[1].padStart(8, '0').toUpperCase(),
              start: hexMatch.index,
              end: hexMatch.index + hexMatch[0].length
            });
          }

          // 为每个16进制标识提取对应的描述
          for (let i = 0; i < hexMatches.length; i++) {
            const current = hexMatches[i];
            const next = hexMatches[i + 1];

            // 确定描述的起始和结束位置
            const descStart = current.end;
            const descEnd = next ? next.start : value.length;

            // 提取描述文本
            let description = value.substring(descStart, descEnd).trim();

            // 智能清理描述文本
            if (description) {
              // 移除开头的各种分隔符和空格
              description = description.replace(/^[\s、,，：:\-\—\–\u3000]+/, '');

              // 移除结尾的各种分隔符和空格
              description = description.replace(/[\s、,，：:\-\—\–\u3000]+$/, '');

              // 如果描述不为空，则保存
              if (description) {
                dataItems[current.id] = description;
              }
            }
          }
        }
      }
    }

    // 方法3: 处理复杂格式，如 020A01FF、020A02FF、020A03FF 当前A、B、C三相电压、电流总谐波含有率
    if (Object.keys(dataItems).length === 0) {
      // 按常见的段落分隔符分割
      const segments = value.split(/[；;。\n\r]/);

      for (const segment of segments) {
        const trimmedSegment = segment.trim();
        if (!trimmedSegment) continue;

        // 查找所有4字节16进制标识（8个字符）
        const hexIds: string[] = [];
        const hexRegex = /([A-Fa-f0-9]{8})(?![A-Fa-f0-9])/g;
        let hexMatch;
        while ((hexMatch = hexRegex.exec(trimmedSegment)) !== null) {
          hexIds.push(hexMatch[1].toUpperCase());
        }

        if (hexIds.length > 0) {
          // 提取描述部分（去掉所有16进制标识后的内容）
          let description = trimmedSegment
            .replace(/[A-Fa-f0-9]{8}(?![A-Fa-f0-9])/g, '') // 移除8位16进制标识
            .replace(/^[\s、,，；;：:\-\—\–\u3000]+/, '') // 移除开头的分隔符和空格
            .replace(/[\s、,，；;：:\-\—\–\u3000]+$/, '') // 移除结尾的分隔符和空格
            .trim();

          // 为每个16进制标识分配描述
          if (description) {
            for (const hexId of hexIds) {
              dataItems[hexId] = description;
            }
          }
        }
      }
    }

    // 方法4: 纯16进制标识（没有描述）
    if (Object.keys(dataItems).length === 0) {
      const hexOnlyRegex = /([A-Fa-f0-9]{8})(?![A-Fa-f0-9])/g;
      while ((match = hexOnlyRegex.exec(value)) !== null) {
        const hexId = match[1].toUpperCase();
        dataItems[hexId] = ''; // 没有描述时使用空字符串
      }
    }

    console.log('最终解析结果:', dataItems);
    return dataItems;
  };

  const generateTaskParam = (taskInfo: TaskInfo, measurementPointsStr?: string): number[] => {
    const paramArray: number[] = [];

    // 1. 有效性标志 (1字节) - 默认为有效
    paramArray.push(1);

    // 2. 上报基准时间：年月日时分 (5字节 BCD码) - 小端顺序（逆序）
    const reportTimeBcdBytes = timeToBcdBytes(taskInfo.reportBaseTime);
    // 逆序添加BCD时间字节
    for (let i = reportTimeBcdBytes.length - 1; i >= 0; i--) {
      paramArray.push(reportTimeBcdBytes[i]);
    }

    // 3. 定时上报周期单位 (1字节) - 0~3依次表示分、时、日、月
    paramArray.push(taskInfo.reportPeriodUnit ?? 0);

    // 4. 定时上报周期 (1字节)
    paramArray.push(taskInfo.reportPeriod ?? 0);

    // 5. 数据结构方式 (1字节) - 0表示自描述格式，1表示按任务定义的数据格式
    paramArray.push(taskInfo.dataStructureType ?? 0);

    // 6. 采样基准时间：年月日时分 (5字节 BCD码) - 小端顺序（逆序）
    const samplingTimeBcdBytes = timeToBcdBytes(taskInfo.samplingBaseTime);
    // 逆序添加BCD时间字节
    for (let i = samplingTimeBcdBytes.length - 1; i >= 0; i--) {
      paramArray.push(samplingTimeBcdBytes[i]);
    }

    // 7. 定时采样周期单位 (1字节)
    paramArray.push(taskInfo.samplingPeriodUnit ?? 0);

    // 8. 定时采样周期 (1字节)
    paramArray.push(taskInfo.samplingPeriod ?? 0);

    // 9. 数据抽取倍率 (1字节)
    paramArray.push(taskInfo.extractionRatio ?? 1);

    // 10. 执行次数 (2字节) - 0表示永远执行 - 小端顺序（逆序）
    const execCount = parseInt(taskInfo.executionCount) || 0;
    paramArray.push(execCount & 0xFF);        // 低字节先
    paramArray.push((execCount >> 8) & 0xFF); // 高字节后

    // 解析测量点标识，支持多种格式
    const parseMeasurementPoints = (pointStr: string): number[] => {
      const points: number[] = [];

      if (!pointStr) return [1]; // 默认返回测量点1

      // 按逗号分割多个测量点范围
      const ranges = pointStr.split(/[,，]/).map(s => s.trim());

      for (const range of ranges) {
        if (!range) continue;

        // 提取数字部分，支持"测量点2"这样的格式
        const cleanRange = range.replace(/[^\d\-]/g, '');

        if (cleanRange.includes('-')) {
          // 处理范围格式，如"251-300"
          const [startStr, endStr] = cleanRange.split('-');
          const start = parseInt(startStr);
          const end = parseInt(endStr);

          if (!isNaN(start) && !isNaN(end) && start <= end) {
            // 展开范围内的所有点
            for (let i = start; i <= end; i++) {
              points.push(i);
            }
          }
        } else {
          // 处理单个数字
          const point = parseInt(cleanRange);
          if (!isNaN(point)) {
            points.push(point);
          }
        }
      }

      // 去重并排序
      return Array.from(new Set(points)).sort((a, b) => a - b);
    };

    // 解析所有测量点 - 使用传入的measurementPointsStr或fallback到taskInfo.measurementPointId
    const pointsToUse = measurementPointsStr || taskInfo.measurementPointId;
    const measurementPoints = parseMeasurementPoints(pointsToUse);

    console.log("使用的测量点字符串：", pointsToUse, "转换结果", measurementPoints);

    // 11. 信息点标识组数n (1字节)
    paramArray.push(measurementPoints.length);

    // 12. 信息点标识1~n (每个2字节) - 使用toDA函数转换测量点号 - 小端顺序（逆序）
    for (const pointId of measurementPoints) {
      const [da1, da2] = toDA(pointId);
      paramArray.push(da1); // 低字节先
      paramArray.push(da2); // 高字节后
    }

    // 13. 数据标识编码组数m (1字节)
    const dataItemsCount = Object.keys(taskInfo.dataItems).length;
    paramArray.push(dataItemsCount);

    // 14. 数据标识编码1~m (每个4字节) - 需要逆序添加
    for (const hexId of Object.keys(taskInfo.dataItems)) {
      // 确保数据标识编码为8位（4字节），不足时前置补0
      const paddedHexId = hexId.padStart(8, '0').toUpperCase();

      if (paddedHexId.length === 8) {
        // 将8位16进制字符串转换为4个字节，并逆序添加
        // 例如："0201FF00" -> [00, FF, 01, 02]
        // 例如："1FF" -> "000001FF" -> [FF, 01, 00, 00]
        const bytes = [];
        for (let i = 0; i < 8; i += 2) {
          const byte = parseInt(paddedHexId.substring(i, i + 2), 16);
          bytes.push(byte);
        }
        // 逆序添加字节
        for (let i = bytes.length - 1; i >= 0; i--) {
          paramArray.push(bytes[i]);
        }
      } else {
        // 如果格式仍然不正确，填充0
        paramArray.push(0, 0, 0, 0);
      }
    }

    return paramArray;
  };

  // 从指定列提取任务信息
  const extractTaskFromColumn = (data: any[][], colIndex: number, structure: ExcelStructure): TaskInfo => {
    const getValue = (rowIndex: number): string => {
      if (rowIndex === -1 || !data[rowIndex]) return '';
      return String(data[rowIndex][colIndex] || '').trim();
    };

    // 获取任务名称
    let taskName = '';
    // 首先尝试从任务名称行获取
    if (structure.taskNameRow !== -1) {
      taskName = getValue(structure.taskNameRow);
    }
    // 如果任务名称行没找到，尝试从任务类型行之前找
    if (!taskName && structure.taskTypeRow !== -1) {
      for (let i = structure.taskTypeRow - 1; i >= 0; i--) {
        const val = getValue(i);
        if (val && val !== '任务名称' && !val.includes('集中器') && !val.includes('模板')) {
          taskName = val;
          break;
        }
      }
    }
    // 如果还是没找到，尝试从第一行或第二行获取
    if (!taskName) {
      taskName = getValue(0) || getValue(1);
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
      measurementPointId: getValue(structure.measurementPointRow),
      executionCount: getValue(structure.executionCountRow),
      dataItems: parseDataItems(rawDataItems),
      dataItemsOriginal: rawDataItems,
      taskParam: ""
    };
    return taskInfo;
  };

  // 解析Excel文件
  const parseExcelFile = (file: File) => {
    setLoading(true);
    setError('');
    setDebugInfo(null);

    const reader = new FileReader();

    reader.onload = (e: ProgressEvent<FileReader>) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        console.log('工作表列表:', workbook.SheetNames);

        // 存储所有sheet的任务数据
        const allSheetData: Record<string, Task[]> = {};
        const allStats: Stats = {
          totalSheets: workbook.SheetNames.length,
          sheetNames: workbook.SheetNames,
          totalTasks: 0,
          tasksBySheet: {}
        };

        // 遍历所有工作表
        for (const sheetName of workbook.SheetNames) {
          try {
            console.log(`\n处理工作表: ${sheetName}`);
            const worksheet = workbook.Sheets[sheetName];

            // 获取合并单元格信息
            const merges = worksheet['!merges'] || [];

            // 转换为二维数组
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {
              header: 1,
              defval: '',
              raw: false
            }) as any[][];

            if (jsonData.length < 10) {
              console.log(`跳过工作表 ${sheetName}: 数据行数不足`);
              continue;
            }

            // 处理合并单元格
            const filledData = fillMergedCells(jsonData, merges);

            // 分析Excel结构
            const structure = analyzeExcelStructure(filledData);
            console.log(`${sheetName} 识别的结构:`, structure);

            // 提取该sheet的所有任务
            const tasks: Task[] = [];

            // 检查是否为单任务模式
            if (structure.isSingleTaskMode) {
              console.log(`${sheetName} 检测到单任务模板`);

              // 智能检测单任务的数据列位置
              let dataColumn = -1;

              // 方法1: 从任务名称行开始查找第一个有效的数据列
              if (structure.taskNameRow !== -1) {
                const taskNameRowData = filledData[structure.taskNameRow] || [];
                for (let col = 1; col < Math.min(10, taskNameRowData.length); col++) {
                  const cellValue = String(taskNameRowData[col] || '').trim();
                  if (cellValue && cellValue !== '任务名称' && !cellValue.includes('说明') && !cellValue.includes('备注')) {
                    dataColumn = col;
                    break;
                  }
                }
              }

              // 方法2: 如果任务名称行没找到数据列，从任务类型行查找
              if (dataColumn === -1 && structure.taskTypeRow !== -1) {
                const taskTypeRowData = filledData[structure.taskTypeRow] || [];
                for (let col = 1; col < Math.min(10, taskTypeRowData.length); col++) {
                  const cellValue = String(taskTypeRowData[col] || '').trim();
                  if (cellValue && cellValue !== '任务类型' && !cellValue.includes('说明') && !cellValue.includes('备注')) {
                    dataColumn = col;
                    break;
                  }
                }
              }

              // 方法3: 如果还没找到，从任务号行查找（如果存在）
              if (dataColumn === -1 && structure.taskNumberRow !== -1) {
                const taskNumberRowData = filledData[structure.taskNumberRow] || [];
                for (let col = 1; col < Math.min(10, taskNumberRowData.length); col++) {
                  const cellValue = String(taskNumberRowData[col] || '').trim();
                  if (cellValue && !isNaN(Number(cellValue))) {
                    dataColumn = col;
                    break;
                  }
                }
              }

              // 默认使用第2列（索引1）如果没有找到其他列
              if (dataColumn === -1) {
                dataColumn = 1;
              }

              console.log(`${sheetName} 检测到单任务数据列: ${dataColumn}`);

              // 从检测到的数据列提取任务信息
              const taskInfo = extractTaskFromColumn(filledData, dataColumn, structure);

              if (taskInfo.taskName && !taskInfo.taskName.includes('任务名称')) {
                // 解析测量点信息
                const parsedMeasurementPoints = parseMeasurementPoints(taskInfo.measurementPointId);

                // 生成任务参数
                const paramArray = generateTaskParam(taskInfo, taskInfo.measurementPointId);
                const taskParam = paramArray.map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');

                // 从任务号行获取任务号
                let taskNumber = 45; // 默认任务号
                if (structure.taskNumberRow !== -1) {
                  // 直接从任务号行获取
                  const taskNumStr = String(filledData[structure.taskNumberRow][2] || '').trim();
                  const num = parseInt(taskNumStr);
                  if (!isNaN(num)) {
                    taskNumber = num;
                  }
                }

                tasks.push({
                  worksheet: sheetName,
                  columnIndex: 2,
                  taskNumber: taskNumber,
                  measurementPoints: taskInfo.measurementPointId,
                  parsedMeasurementPoints: parsedMeasurementPoints,
                  measurementPointsCount: parsedMeasurementPoints.length,
                  ...taskInfo,
                  taskParam: taskParam
                });
              }
            } else if (structure.taskMappingStartRow === -1) {
              console.log(`跳过工作表 ${sheetName}: 未能识别任务号映射表`);
              continue;
            } else {
              // 原有的多任务处理逻辑
              // 提取测量点范围
              const measurementRanges = extractMeasurementRanges(filledData, structure.taskMappingStartRow);
              console.log(`${sheetName} 测量点范围数量:`, measurementRanges.length);

              // 提取该sheet的所有任务
              const maxCols = Math.max(...filledData.map(row => row.length));

              // 从第2列开始遍历（第1列是标签列），但要智能判断起始列
              let startCol = 1;
              // 检查第一行或第二行，找到第一个非空的任务名称列
              for (let col = 0; col < Math.min(5, maxCols); col++) {
                const val = filledData[0] ? String(filledData[0][col] || '').trim() : '';
                if (val && val !== '任务名称' && val !== '任务系统' && val !== 'A' && !val.includes('测量点号')) {
                  startCol = col;
                  break;
                }
              }

              console.log(`${sheetName} 从第 ${startCol + 1} 列开始提取`);

              for (let col = startCol; col < maxCols; col++) {
                // 提取该列的任务基本信息
                const taskInfo = extractTaskFromColumn(filledData, col, structure);

                // 如果任务名称为空或是标签列，跳过该列
                if (!taskInfo.taskName ||
                  taskInfo.taskName.includes('任务名称') ||
                  taskInfo.taskName.includes('任务系统') ||
                  taskInfo.taskName === 'A') {
                  continue;
                }

                // 提取该列在每个测量点范围对应的任务号
                const taskNumberMap = new Map(); // 任务号 -> 测量点范围数组

                for (const rangeInfo of measurementRanges) {
                  const taskNumber = filledData[rangeInfo.rowIndex]
                    ? String(filledData[rangeInfo.rowIndex][col] || '').trim()
                    : '';

                  // 只有当任务号存在且为数字时才记录
                  if (taskNumber && !isNaN(Number(taskNumber)) && taskNumber !== '任务号' && taskNumber !== '0') {
                    const num = parseInt(taskNumber);
                    if (!taskNumberMap.has(num)) {
                      taskNumberMap.set(num, []);
                    }
                    taskNumberMap.get(num)?.push(rangeInfo.range);
                  }
                }

                // 如果该列没有找到任何有效的任务号，跳过
                if (taskNumberMap.size === 0) {
                  continue;
                }

                // 为每个不同的任务号创建一条记录，包含其所有测量点范围
                taskNumberMap.forEach((ranges, taskNum) => {
                  const measurementPointsStr = ranges.join(', '); // 将多个范围用逗号连接

                  // 解析测量点信息
                  const parsedMeasurementPoints = parseMeasurementPoints(measurementPointsStr);

                  // 使用正确的测量点信息重新生成任务参数
                  const paramArray = generateTaskParam(taskInfo, measurementPointsStr);
                  const taskParam = paramArray.map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');

                  tasks.push({
                    worksheet: sheetName,
                    columnIndex: col,
                    taskNumber: taskNum,
                    measurementPoints: measurementPointsStr,
                    parsedMeasurementPoints: parsedMeasurementPoints,
                    measurementPointsCount: parsedMeasurementPoints.length,
                    ...taskInfo,
                    taskParam: taskParam // 使用重新生成的任务参数
                  });
                });
              }
            }

            console.log(`${sheetName} 提取任务数:`, tasks.length);

            // 保存该sheet的任务数据
            if (tasks.length > 0) {
              allSheetData[sheetName] = tasks;
              allStats.tasksBySheet[sheetName] = tasks.length;
              allStats.totalTasks += tasks.length;
            }

          } catch (err) {
            console.error(`处理工作表 ${sheetName} 时出错:`, err);
          }
        }

        if (Object.keys(allSheetData).length === 0) {
          throw new Error('未能从任何工作表中提取到任务数据');
        }

        setExtractedData(allSheetData);
        setStats(allStats);
        setSelectedSheet('all');
        setLoading(false);

      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        setError(`解析失败: ${errorMessage}`);
        setLoading(false);
        console.error('解析错误:', err);
      }
    };

    reader.onerror = () => {
      setError('文件读取失败');
      setLoading(false);
    };

    reader.readAsArrayBuffer(file);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setFileName(file.name);
      parseExcelFile(file);
    }
  };

  const exportToJSON = () => {
    const blob = new Blob([JSON.stringify(extractedData, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '任务定义提取结果_按Sheet分类.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportToINI = () => {
    let output = '';

    // 按sheet分组输出
    for (const [sheetName, tasks] of Object.entries(extractedData)) {
      output += `${'='.repeat(60)}\n`;
      output += `工作表: ${sheetName}\n`;
      output += `${'='.repeat(60)}\n\n`;

      tasks.forEach((task, index) => {
        output += `---------- 任务 ${index + 1} ----------\n`;
        output += `{\n`;
        output += `    "工作表": "${task.worksheet}",\n`;
        output += `    "任务名称": "${task.taskName}",\n`;
        output += `    "任务号": ${task.taskNumber},\n`;
        output += `    "测量点号": "${task.measurementPoints}",\n`;
        output += `    "任务类型": "${task.taskType}",\n`;
        output += `    "数据结构方式": "${task.dataStructureType}",\n`;
        output += `    "采样基准时间": "${task.samplingBaseTime}",\n`;
        output += `    "定时采样周期": "${task.samplingPeriod}",\n`;
        output += `    "定时采样周期单位": "${task.samplingPeriodUnit}",\n`;
        output += `    "上报基准时间": "${task.reportBaseTime}",\n`;
        output += `    "定时上报周期": "${task.reportPeriod}",\n`;
        output += `    "定时上报周期单位": "${task.reportPeriodUnit}",\n`;
        output += `    "数据抽取倍率": "${task.extractionRatio}",\n`;
        output += `    "执行次数": "${task.executionCount}",\n`;
        output += `    "数据项": "${task.dataItems}"\n`;
        output += `    "任务参数": "${task.taskParam}"\n`;
        output += `}\n\n`;
      });

      output += '\n\n';
    }

    const blob = new Blob([output], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '任务定义提取结果_按Sheet分类.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取任务的唯一标识
  const getTaskKey = (task: Task): string => {
    return `${task.worksheet}-${task.taskNumber}-${task.columnIndex}`;
  };

  // 获取选中的任务列表
  const getSelectedTasks = (): Task[] => {
    const allTasks = getCurrentTasks();
    return allTasks.filter(task => selectedTasks.has(getTaskKey(task)));
  };

  // 切换任务选择状态
  const toggleTaskSelection = (task: Task) => {
    const taskKey = getTaskKey(task);
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskKey)) {
      newSelected.delete(taskKey);
    } else {
      newSelected.add(taskKey);
    }
    setSelectedTasks(newSelected);
  };

  // 全选/取消全选当前筛选的任务
  const toggleSelectAll = () => {
    // 获取当前筛选后的任务
    const { filters, generalTerms } = parseSearchQuery(searchText);
    const filteredTasks = searchText
      ? getCurrentTasks().filter(task => matchesSearchCriteria(task, filters, generalTerms))
      : getCurrentTasks();

    // 检查当前筛选的任务是否全部已选中
    const filteredTaskKeys = filteredTasks.map(task => getTaskKey(task));
    const allFilteredSelected = filteredTaskKeys.every(key => selectedTasks.has(key));

    if (allFilteredSelected && filteredTaskKeys.length > 0) {
      // 当前筛选的任务全部选中，则取消选中这些任务
      const newSelectedTasks = new Set(selectedTasks);
      filteredTaskKeys.forEach(key => newSelectedTasks.delete(key));
      setSelectedTasks(newSelectedTasks);
    } else {
      // 部分或全部未选中，则选中当前筛选的所有任务
      const newSelectedTasks = new Set(selectedTasks);
      filteredTaskKeys.forEach(key => newSelectedTasks.add(key));
      setSelectedTasks(newSelectedTasks);
    }
  };

  const exportToTaskTemplate = () => {
    const tasksToExport = selectedTasks.size > 0 ? getSelectedTasks() : getCurrentTasks();

    // 根据任务类型分类任务
    const baseTasks: Array<{ TaskId: number, TaskParam: string }> = [];
    const meterTasks: Array<{ TaskId: number, TaskParam: string }> = [];

    tasksToExport.forEach(task => {
      const taskData = {
        TaskId: task.taskNumber,
        TaskParam: task.taskParam.replace(/\s/g, '') // 移除空格，生成连续的16进制字符串
      };

      // 根据任务类型判断分类
      const taskType = task.taskType.toLowerCase();
      if (taskType.includes('表端') || taskType.includes('meter')) {
        meterTasks.push(taskData);
      } else {
        // 默认归类为普通任务（BaseTask）
        baseTasks.push(taskData);
      }
    });

    // 生成任务模板JSON
    const taskTemplate = {
      BaseTask: baseTasks,
      MeterTask: meterTasks
    };

    const blob = new Blob([JSON.stringify(taskTemplate, null, 2)], {
      type: 'application/json;charset=utf-8'
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '任务模板.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  // 获取当前显示的任务列表
  const getCurrentTasks = () => {
    if (selectedSheet === 'all') {
      // 合并所有sheet的任务
      return Object.values(extractedData).flat();
    } else {
      return extractedData[selectedSheet] || [];
    }
  };

  // 高级搜索功能 - 支持类似GitHub的搜索语法
  const parseSearchQuery = (query: string) => {
    const filters: Record<string, string[]> = {};
    const generalTerms: string[] = [];

    if (!query.trim()) return { filters, generalTerms };

    // 匹配 key:value 格式的搜索条件
    const keyValueRegex = /(\w+):([^\s]+)/g;
    let match;
    let processedQuery = query;

    while ((match = keyValueRegex.exec(query)) !== null) {
      const [fullMatch, key, value] = match;
      const normalizedKey = key.toLowerCase();

      if (!filters[normalizedKey]) {
        filters[normalizedKey] = [];
      }
      filters[normalizedKey].push(value.toLowerCase());

      // 从查询中移除已处理的部分
      processedQuery = processedQuery.replace(fullMatch, '').trim();
    }

    // 剩余的词作为通用搜索词
    if (processedQuery) {
      generalTerms.push(...processedQuery.split(/\s+/).filter(term => term.length > 0));
    }

    return { filters, generalTerms };
  };

  const matchesSearchCriteria = (task: Task, filters: Record<string, string[]>, generalTerms: string[]) => {
    // 检查特定字段过滤器
    for (const [key, values] of Object.entries(filters)) {
      let fieldMatched = false;

      for (const value of values) {
        switch (key) {
          case 'taskid':
          case 'id':
          case 'task':
            // 精确匹配任务号
            if (task.taskNumber.toString() === value) {
              fieldMatched = true;
            }
            break;
          case 'name':
          case 'taskname':
            // 部分匹配任务名称
            if (task.taskName.toLowerCase().includes(value)) {
              fieldMatched = true;
            }
            break;
          case 'sheet':
          case 'worksheet':
            // 部分匹配工作表名称
            if (task.worksheet.toLowerCase().includes(value)) {
              fieldMatched = true;
            }
            break;
          case 'type':
          case 'tasktype':
            // 部分匹配任务类型
            if (task.taskType.toLowerCase().includes(value)) {
              fieldMatched = true;
            }
            break;
          case 'points':
          case 'measurement':
            // 部分匹配测量点范围
            if (task.measurementPoints.toLowerCase().includes(value)) {
              fieldMatched = true;
            }
            break;
          case 'count':
          case 'pointcount':
            // 精确匹配测量点数量
            if (task.measurementPointsCount.toString() === value) {
              fieldMatched = true;
            }
            break;
          case 'data':
          case 'dataitems':
            // 精确匹配数据项数量
            const dataItemCount = Object.keys(task.dataItems || {}).length;
            if (dataItemCount.toString() === value) {
              fieldMatched = true;
            }
            break;
          case 'period':
          case 'sampling':
            // 精确匹配采样周期
            if (task.samplingPeriod?.toString() === value) {
              fieldMatched = true;
            }
            break;
          case 'report':
            // 精确匹配上报周期
            if (task.reportPeriod?.toString() === value) {
              fieldMatched = true;
            }
            break;
          case 'col':
          case 'column':
            // 精确匹配列号
            if (task.columnIndex.toString() === value) {
              fieldMatched = true;
            }
            break;
        }

        if (fieldMatched) break;
      }

      // 如果任何一个过滤器不匹配，则整个任务不匹配
      if (!fieldMatched) return false;
    }

    // 检查通用搜索词
    if (generalTerms.length > 0) {
      const searchableText = [
        task.taskNumber.toString(),
        task.taskName,
        task.taskType,
        task.worksheet,
        task.measurementPoints,
        task.dataItemsOriginal || '',
        Object.keys(task.dataItems || {}).join(' '),
        Object.values(task.dataItems || {}).join(' ')
      ].join(' ').toLowerCase();

      return generalTerms.every(term =>
        searchableText.includes(term.toLowerCase())
      );
    }

    return true;
  };

  const { filters, generalTerms } = parseSearchQuery(searchText);
  const filteredData = searchText
    ? getCurrentTasks().filter(task => matchesSearchCriteria(task, filters, generalTerms))
    : getCurrentTasks();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2 flex items-center gap-3">
            <FileText className="text-indigo-600" size={32} />
            智能Excel任务定义提取工具
          </h1>
          <p className="text-gray-600 mb-6">自动识别Excel结构，按任务列提取完整定义（任务属性+测量点范围+任务号）</p>

          <div className="flex gap-4 mb-6">
            <label className="flex-1 cursor-pointer">
              <div className="border-2 border-dashed border-indigo-300 rounded-lg p-6 hover:border-indigo-500 hover:bg-indigo-50 transition-all">
                <div className="flex flex-col items-center gap-2">
                  <Upload className="text-indigo-600" size={32} />
                  <span className="text-sm font-medium text-gray-700">
                    {fileName || '点击上传Excel文件'}
                  </span>
                  <span className="text-xs text-gray-500">支持 .xlsx, .xls 格式</span>
                </div>
              </div>
              <input
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
            </label>
          </div>

          {loading && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <span className="text-blue-800">正在智能分析Excel结构并提取数据...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3">
                <AlertCircle className="text-red-600" size={20} />
                <span className="text-red-800">{error}</span>
              </div>
            </div>
          )}

          {stats && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="text-green-600" size={20} />
                <span className="text-green-800 font-semibold">解析成功！</span>
              </div>
              <div className="text-sm text-green-700 space-y-1">
                <p>✓ 共处理 <strong>{stats.totalSheets}</strong> 个工作表</p>
                <p>✓ 共提取 <strong>{stats.totalTasks}</strong> 个任务定义</p>
                <div className="mt-2 p-2 bg-white rounded">
                  <p className="font-semibold mb-1">各工作表任务数:</p>
                  {Object.entries(stats.tasksBySheet).map(([sheet, count]) => (
                    <p key={sheet} className="text-xs ml-2">• {sheet}: {count} 个任务</p>
                  ))}
                </div>
              </div>
            </div>
          )}

          {Object.keys(extractedData).length > 0 && (
            <>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择工作表
                </label>
                <select
                  value={selectedSheet}
                  onChange={(e) => setSelectedSheet(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                >
                  <option value="all">全部工作表</option>
                  {stats?.sheetNames.map(name => (
                    <option key={name} value={name}>{name} ({stats?.tasksBySheet[name] || 0}个任务)</option>
                  ))}
                </select>
              </div>

              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-gray-400" size={20} />
                  <input
                    type="text"
                    placeholder="高级搜索: taskid:1 name:电压 sheet:Sheet1 count:50 ..."
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>

                {/* 搜索提示 */}
                <div className="mt-2 text-xs text-gray-500">
                  <div className="flex flex-wrap gap-4">
                    <span><code className="bg-gray-100 px-1 rounded">taskid:1</code> 任务号</span>
                    <span><code className="bg-gray-100 px-1 rounded">name:电压</code> 任务名称</span>
                    <span><code className="bg-gray-100 px-1 rounded">sheet:Sheet1</code> 工作表</span>
                    <span><code className="bg-gray-100 px-1 rounded">type:定时</code> 任务类型</span>
                    <span><code className="bg-gray-100 px-1 rounded">count:50</code> 测量点数</span>
                    <span><code className="bg-gray-100 px-1 rounded">data:3</code> 数据项数</span>
                  </div>
                  <div className="mt-1">
                    <span className="text-gray-400">支持组合搜索，如: </span>
                    <code className="bg-blue-50 text-blue-700 px-1 rounded">taskid:1 sheet:Sheet1 电压</code>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mb-6">
                <button
                  onClick={exportToINI}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download size={18} />
                  导出INI格式
                </button>
                <button
                  onClick={exportToJSON}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download size={18} />
                  导出JSON格式
                </button>
                <button
                  onClick={exportToTaskTemplate}
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <Download size={18} />
                  导出任务模板
                </button>
              </div>
            </>
          )}
        </div>

        {filteredData.length > 0 && (
          <div className="flex gap-6">
            {/* 左侧任务列表 */}
            <div className="flex-1 space-y-4 max-w-4xl">
              <div className="bg-white rounded-lg shadow p-4 mb-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    显示 <strong>{filteredData.length}</strong> 个任务定义
                    {searchText && ` (已筛选)`}
                  </p>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      已选择 <strong>{selectedTasks.size}</strong> 个任务
                    </span>
                    <button
                      onClick={toggleSelectAll}
                      className="text-sm bg-blue-100 text-blue-700 px-3 py-1 rounded hover:bg-blue-200 transition-colors"
                    >
                      {(() => {
                        const filteredTaskKeys = filteredData.map(task => getTaskKey(task));
                        const allFilteredSelected = filteredTaskKeys.every(key => selectedTasks.has(key));
                        return allFilteredSelected && filteredTaskKeys.length > 0 ? '取消全选' : '全选';
                      })()}
                    </button>
                  </div>
                </div>
              </div>

              {filteredData.map((task, index) => (
                <TaskDetail
                  key={`${task.worksheet}-${task.taskNumber}-${index}`}
                  task={task}
                  expandedMeasurementPoints={expandedMeasurementPoints}
                  setExpandedMeasurementPoints={setExpandedMeasurementPoints}
                  showCheckbox={true}
                  selectedTasks={selectedTasks}
                  toggleTaskSelection={toggleTaskSelection}
                  getTaskKey={getTaskKey}
                />
              ))}
            </div>

            {/* 右侧选择任务面板 */}
            <div className="w-80 bg-white rounded-lg shadow-lg p-4 sticky top-4 h-fit">
              <h3 className="text-lg font-bold text-gray-800 mb-4">
                选中的任务 ({selectedTasks.size})
              </h3>

              {selectedTasks.size === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  <p className="text-sm">还没有选择任务</p>
                  <p className="text-xs mt-1">勾选左侧任务来添加到选择列表</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {getSelectedTasks().map((task) => (
                    <div
                      key={getTaskKey(task)}
                      onClick={() => setPreviewTask(task)}
                      className="p-3 rounded-lg border cursor-pointer transition-colors border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="bg-indigo-100 text-indigo-800 px-2 py-1 rounded text-xs font-mono">
                            #{task.taskNumber}
                          </span>
                          <span className="text-sm font-medium text-gray-800 truncate">
                            {task.taskName}
                          </span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTaskSelection(task);
                          }}
                          className="text-red-500 hover:text-red-700 text-xs"
                        >
                          ✕
                        </button>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {task.worksheet} • 列{task.columnIndex} • {task.measurementPointsCount}个测量点
                      </div>
                    </div>
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

        {/* 任务预览悬浮窗口 */}
        <TaskPreview
          task={previewTask}
          onClose={() => setPreviewTask(null)}
          expandedMeasurementPoints={expandedMeasurementPoints}
          setExpandedMeasurementPoints={setExpandedMeasurementPoints}
        />
      </div>
    </div>
  );
};

const InfoItem: React.FC<InfoItemProps> = ({ label, value, originalValue, highlight = false }) => (
  <div className={`p-2 rounded-lg ${highlight ? 'bg-indigo-50 border border-indigo-200' : 'bg-gray-50'}`}>
    <div className="text-xs text-gray-600 mb-1">{label}</div>
    <div className={`font-mono text-sm ${highlight ? 'text-indigo-800 font-semibold' : 'text-gray-800'}`}>
      {value !== null && value !== undefined ? value : '-'}
    </div>
    {originalValue && originalValue !== String(value) && (
      <div className="text-xs text-gray-500 mt-1">
        原值: {originalValue}
      </div>
    )}
  </div>
);

// 任务详情组件
const TaskDetail: React.FC<TaskDetailProps> = ({
  task,
  expandedMeasurementPoints,
  setExpandedMeasurementPoints,
  showCheckbox = false,
  selectedTasks,
  toggleTaskSelection,
  getTaskKey
}) => {
  const taskKey = `${task.worksheet}-${task.taskNumber}-${task.columnIndex}`;

  return (
    <div className="bg-white rounded-lg shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex items-start justify-between mb-4 pb-3 border-b-2 border-indigo-200">
        <div className="flex items-center gap-3">
          {showCheckbox && selectedTasks && toggleTaskSelection && getTaskKey && (
            <input
              type="checkbox"
              checked={selectedTasks.has(getTaskKey(task))}
              onChange={() => toggleTaskSelection(task)}
              className="w-5 h-5 text-indigo-600 bg-gray-100 border-gray-300 rounded focus:ring-indigo-500 focus:ring-2"
            />
          )}
          <div className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-lg">
            #{task.taskNumber}
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-800">{task.taskName}</h2>
            <p className="text-sm text-gray-600">{task.taskType}</p>
          </div>
        </div>
        <div className="text-right">
          <div className="bg-purple-100 text-purple-800 px-3 py-1 rounded text-sm font-medium mb-1">
            {task.worksheet}
          </div>
          <div className="text-xs text-gray-500">
            列 {task.columnIndex}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-4">
        <InfoItem
          label="数据结构方式"
          value={task.dataStructureType}
          originalValue={task.dataStructureTypeOriginal}
        />
        <InfoItem
          label="采样基准时间"
          value={task.samplingBaseTime}
          originalValue={task.samplingBaseTimeOriginal}
          highlight
        />
        <InfoItem
          label="定时采样周期"
          value={task.samplingPeriod}
          originalValue={task.samplingPeriodOriginal}
        />
        <InfoItem
          label="采样周期单位"
          value={task.samplingPeriodUnit}
          originalValue={task.samplingPeriodUnitOriginal}
        />
        <InfoItem
          label="上报基准时间"
          value={task.reportBaseTime}
          originalValue={task.reportBaseTimeOriginal}
          highlight
        />
        <InfoItem
          label="定时上报周期"
          value={task.reportPeriod}
          originalValue={task.reportPeriodOriginal}
        />
        <InfoItem
          label="上报周期单位"
          value={task.reportPeriodUnit}
          originalValue={task.reportPeriodUnitOriginal}
        />
        <InfoItem
          label="数据抽取倍率"
          value={task.extractionRatio}
          originalValue={task.extractionRatioOriginal}
        />
        <InfoItem label="执行次数" value={task.executionCount} />
      </div>

      <div className="mt-4 pt-4 border-t border-gray-200">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-gray-700 text-sm">
              测量点号 (共{task.measurementPointsCount}个):
            </span>
            <button
              onClick={() => {
                const newExpanded = new Set(expandedMeasurementPoints);
                if (newExpanded.has(taskKey)) {
                  newExpanded.delete(taskKey);
                } else {
                  newExpanded.add(taskKey);
                }
                setExpandedMeasurementPoints(newExpanded);
              }}
              className="text-xs text-yellow-700 hover:text-yellow-900 px-2 py-1 rounded hover:bg-yellow-100"
            >
              {expandedMeasurementPoints.has(taskKey) ? '收起详情' : '展开详情'}
            </button>
          </div>

          {/* 显示原始测量点范围 */}
          <div className="mt-2">
            <div className="text-xs text-gray-600 mb-1">原始范围:</div>
            <div className="flex flex-wrap gap-1">
              {task.measurementPoints.split(', ').map((range, idx) => (
                <span key={idx} className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-mono">
                  {range}
                </span>
              ))}
            </div>
          </div>

          {/* 展开显示解析后的测量点详情 */}
          {expandedMeasurementPoints.has(taskKey) && (
            <div className="mt-3 pt-3 border-t border-yellow-300">
              <div className="text-xs text-gray-600 mb-2">解析结果 (展开的测量点):</div>
              <div className="bg-white border border-yellow-300 rounded p-2 max-h-32 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {task.parsedMeasurementPoints.map((point, idx) => (
                    <span key={idx} className="inline-block bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-xs font-mono">
                      {point}
                    </span>
                  ))}
                </div>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                总计: {task.measurementPointsCount} 个测量点
              </div>
            </div>
          )}
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <span className="font-semibold text-gray-700 text-sm">
            数据项 ({task.dataItems ? Object.keys(task.dataItems).length : 0}个):
          </span>

          {/* 显示原始数据项信息 */}
          {task.dataItemsOriginal && (
            <div className="mt-2 mb-3">
              <div className="text-xs text-gray-600 mb-1">原始数据:</div>
              <div className="bg-gray-100 border border-gray-300 rounded p-2 text-sm text-gray-700 break-all">
                {task.dataItemsOriginal}
              </div>
            </div>
          )}

          {/* 显示提取后的结构化数据项 */}
          {task.dataItems && Object.keys(task.dataItems).length > 0 ? (
            <div className="mt-2">
              <div className="text-xs text-gray-600 mb-2">提取结果:</div>
              <div className="space-y-1">
                {Object.entries(task.dataItems).map(([hexId, name]) => (
                  <div key={hexId} className="flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-mono">
                      {hexId}
                    </span>
                    <span className="text-sm text-blue-800">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : task.dataItemsOriginal ? (
            <div className="mt-2">
              <div className="text-xs text-orange-600 bg-orange-50 border border-orange-200 rounded p-2">
                未能从原始数据中提取到结构化的数据项信息
              </div>
            </div>
          ) : (
            <div className="mt-2">
              <div className="text-xs text-gray-500">无数据项信息</div>
            </div>
          )}
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mt-3">
          <span className="font-semibold text-gray-700 text-sm">任务参数 (16进制): </span>
          <div className="mt-2">
            <div className="bg-white border border-green-300 rounded p-2 font-mono text-sm text-green-800 break-all">
              {task.taskParam || '未生成'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 任务预览悬浮组件
const TaskPreview: React.FC<{
  task: Task | null;
  onClose: () => void;
  expandedMeasurementPoints: Set<string>;
  setExpandedMeasurementPoints: (expanded: Set<string>) => void;
}> = ({ task, onClose, expandedMeasurementPoints, setExpandedMeasurementPoints }) => {
  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-600 text-white px-3 py-1 rounded-lg font-bold">
              #{task.taskNumber}
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-800">{task.taskName}</h2>
              <p className="text-sm text-gray-600">{task.taskType} • {task.worksheet}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
          <TaskDetail
            task={task}
            expandedMeasurementPoints={expandedMeasurementPoints}
            setExpandedMeasurementPoints={setExpandedMeasurementPoints}
            showCheckbox={false}
          />
        </div>
      </div>
    </div>
  );
};

export default TaskExtractor;