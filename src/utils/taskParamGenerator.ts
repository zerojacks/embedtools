import { TaskInfo } from '@/types/task';
import { parseMeasurementPoints } from './dataParser';

/**
 * 转换函数 - 将Python的toDA函数转换为TypeScript
 */
export const toDA = (iVal: number): [number, number] => {
  if (iVal === 0xFFFF) return [0xFF, 0xFF];
  const low = (iVal - 1) % 8;
  const high = Math.floor((iVal - 1) / 8);
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

/**
 * 16进制转BCD函数
 */
export const hexToBcd = (hexValue: number): number => {
  // 将16进制数转换为BCD码
  if (hexValue > 99) {
    // 如果超过99，取模100
    hexValue = hexValue % 100;
  }

  const tens = Math.floor(hexValue / 10);
  const units = hexValue % 10;

  // BCD编码：十位数字在高4位，个位数字在低4位
  return (tens << 4) | units;
};

/**
 * 时间字符串转BCD字节数组函数
 */
export const timeToBcdBytes = (timeStr: string): number[] => {
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

/**
 * 生成任务参数
 */
export const generateTaskParam = (taskInfo: TaskInfo, measurementPointsStr?: string): number[] => {
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