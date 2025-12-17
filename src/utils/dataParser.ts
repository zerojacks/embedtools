/**
 * 数据解析相关工具函数
 */

/**
 * 处理数据结构方式
 */
export const parseDataStructureType = (value: string): number | null => {
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

/**
 * 处理周期数值（采样周期、上报周期）
 */
export const parsePeriodValue = (value: string): number | null => {
  if (!value) return null;

  // 提取数字部分
  const match = value.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }

  return null;
};

/**
 * 处理周期单位
 */
export const parsePeriodUnit = (value: string): number | null => {
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

/**
 * 处理数据抽取倍率
 */
export const parseExtractionRatio = (value: string): number | null => {
  if (!value) return null;

  const match = value.match(/(\d+)/);
  if (match) {
    return parseInt(match[1]);
  }

  return null;
};

/**
 * 处理时间格式 - 转换为YYMMDDhhmm格式（10位）
 */
export const parseTimeFormat = (value: string): string => {
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

/**
 * 解析测量点标识，支持多种格式
 */
export const parseMeasurementPoints = (pointStr: string): number[] => {
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

/**
 * 处理数据项信息 - 4字节16进制数据标识（8个字符）
 */
export const parseDataItems = (value: string): Record<string, string> => {
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
      // 格式类型A: 段落格式
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
      // 格式类型B: 连续格式
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
          match = trimmedItem.match(/^([0-9]{8})([A-Za-z\u4e00-\u9fff].*)$/);
          if (match) {
            hexId = match[1].toUpperCase();
            description = match[2];
          } else {
            // 方法3: 匹配7位数字 + 字母开头的描述
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

  // 方法3: 处理复杂格式
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