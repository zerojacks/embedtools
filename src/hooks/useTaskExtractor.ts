import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Task, Stats } from '@/types/task';
import { fillMergedCells, analyzeExcelStructure, extractMeasurementRangesIntelligent, extractMeasurementRangesByColumn, isColumnMultiRowMode } from '@/utils/excelParser';
import { extractTaskFromColumn } from '@/utils/taskExtractor';
import { generateTaskParam } from '@/utils/taskParamGenerator';
import { parseMeasurementPoints } from '@/utils/dataParser';

export const useTaskExtractor = () => {
  const [extractedData, setExtractedData] = useState<Record<string, Task[]>>({});
  const [fileName, setFileName] = useState<string>('');
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const parseExcelFile = (file: File) => {
    setLoading(true);
    setError('');

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

            // 分析Excel结构（获取基本的行位置信息）
            const structure = analyzeExcelStructure(filledData);
            console.log(`${sheetName} 识别的结构:`, structure);

            // 提取该sheet的所有任务
            const tasks: Task[] = [];
            const maxCols = Math.max(...filledData.map(row => row.length));

            // 确定开始扫描的列
            let startCol = 1;
            if (structure.taskNameRow !== -1) {
              const taskNameRowData = filledData[structure.taskNameRow] || [];
              for (let col = 1; col < Math.min(25, taskNameRowData.length); col++) {
                const cellValue = String(taskNameRowData[col] || '').trim();
                if (cellValue && !cellValue.includes('测量点号') && !cellValue.includes('任务名称')) {
                  startCol = col;
                  break;
                }
              }
            }

            console.log(`${sheetName} 从第 ${startCol + 1} 列开始扫描，最大列数: ${maxCols}`);

            // 逐列分析，每列独立判断模式
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

              console.log(`${sheetName} 列 ${col + 1} 任务名称: "${taskInfo.taskName}"`);

              // 判断当前列是单任务模式还是多行模式
              // 对于有任务映射表的情况，优先检查是否有任务号分配
              let isCurrentColumnMultiRowMode = false;

              if (structure.taskMappingStartRow !== -1) {
                // 检查该列在任务映射区域是否有任务号分配
                let hasTaskNumberMapping = false;
                for (let i = structure.taskMappingStartRow; i < filledData.length; i++) {
                  const row = filledData[i];
                  if (!row || row.length === 0) break;

                  const rangeLabel = String(row[0] || '').trim();
                  if (!rangeLabel) break;
                  if (rangeLabel.includes('说明') || rangeLabel.includes('注') || rangeLabel.includes('备注')) {
                    break;
                  }

                  const taskNumber = String(row[col] || '').trim();
                  if (taskNumber && !isNaN(Number(taskNumber)) && taskNumber !== '0') {
                    hasTaskNumberMapping = true;
                    break;
                  }
                }

                // 如果有任务号分配，则为多行模式
                if (hasTaskNumberMapping) {
                  isCurrentColumnMultiRowMode = true;
                } else {
                  // 如果没有任务号分配，则使用原来的判断逻辑
                  isCurrentColumnMultiRowMode = isColumnMultiRowMode(filledData, structure.measurementPointRow, col);
                }
              } else {
                // 没有任务映射表，使用原来的判断逻辑
                isCurrentColumnMultiRowMode = isColumnMultiRowMode(filledData, structure.measurementPointRow, col);
              }

              if (isCurrentColumnMultiRowMode) {
                console.log(`${sheetName} 列 ${col + 1} 检测为多行模式`);

                // 多行模式：提取该列在每个测量点范围对应的任务号
                const taskNumberMap = new Map<number, string[]>(); // 任务号 -> 测量点范围数组

                // 从任务映射开始行提取任务号和测量点范围
                if (structure.taskMappingStartRow !== -1) {
                  for (let i = structure.taskMappingStartRow; i < filledData.length; i++) {
                    const row = filledData[i];
                    if (!row || row.length === 0) break;

                    const rangeLabel = String(row[0] || '').trim();
                    if (!rangeLabel) break;
                    if (rangeLabel.includes('说明') || rangeLabel.includes('注') || rangeLabel.includes('备注')) {
                      break;
                    }

                    // 获取该行该列的任务号
                    const taskNumber = String(row[col] || '').trim();

                    // 只有当任务号存在且为数字时才记录
                    if (taskNumber && !isNaN(Number(taskNumber)) && taskNumber !== '0') {
                      const num = parseInt(taskNumber);
                      if (!taskNumberMap.has(num)) {
                        taskNumberMap.set(num, []);
                      }
                      taskNumberMap.get(num)?.push(rangeLabel);
                    }
                  }

                  console.log(`${sheetName} 列 ${col + 1} 任务号映射:`, Array.from(taskNumberMap.entries()));
                } else {
                  console.log(`${sheetName} 列 ${col + 1} 未找到任务映射开始行`);
                }

                // 如果该列没有找到任何有效的任务号，跳过
                if (taskNumberMap.size === 0) {
                  console.log(`${sheetName} 列 ${col + 1} 未找到有效任务号，跳过`);
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

                  console.log(`${sheetName} 创建多行任务: 任务号=${taskNum}, 测量点=${measurementPointsStr}`);

                  tasks.push({
                    worksheet: sheetName,
                    columnIndex: col,
                    taskNumber: taskNum,
                    measurementPoints: measurementPointsStr,
                    parsedMeasurementPoints: parsedMeasurementPoints,
                    measurementPointsCount: parsedMeasurementPoints.length,
                    ...taskInfo,
                    taskParam: taskParam
                  });
                });
              } else {
                console.log(`${sheetName} 列 ${col + 1} 检测为单任务模式`);

                // 单任务模式：直接从该列提取单个任务
                if (taskInfo.taskName && !taskInfo.taskName.includes('任务名称')) {
                  // 解析测量点信息
                  const parsedMeasurementPoints = parseMeasurementPoints(taskInfo.measurementPointId);

                  // 生成任务参数
                  const paramArray = generateTaskParam(taskInfo, taskInfo.measurementPointId);
                  const taskParam = paramArray.map(byte => byte.toString(16).toUpperCase().padStart(2, '0')).join(' ');

                  // 从任务号行获取任务号，如果没有则使用默认值
                  let taskNumber = 45; // 默认任务号
                  if (structure.taskNumberRow !== -1) {
                    const taskNumStr = String(filledData[structure.taskNumberRow][col] || '').trim();
                    const num = parseInt(taskNumStr);
                    if (!isNaN(num)) {
                      taskNumber = num;
                    }
                  }

                  console.log(`${sheetName} 创建单任务: 任务号=${taskNumber}, 测量点=${taskInfo.measurementPointId}`);

                  tasks.push({
                    worksheet: sheetName,
                    columnIndex: col,
                    taskNumber: taskNumber,
                    measurementPoints: taskInfo.measurementPointId,
                    parsedMeasurementPoints: parsedMeasurementPoints,
                    measurementPointsCount: parsedMeasurementPoints.length,
                    ...taskInfo,
                    taskParam: taskParam
                  });
                }
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

  return {
    extractedData,
    fileName,
    stats,
    loading,
    error,
    handleFileUpload
  };
};