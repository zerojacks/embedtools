import { Task, SearchFilters } from '@/types/task';

/**
 * 高级搜索功能 - 支持类似GitHub的搜索语法
 */
export const parseSearchQuery = (query: string): SearchFilters => {
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

/**
 * 检查任务是否匹配搜索条件
 */
export const matchesSearchCriteria = (
  task: Task, 
  filters: Record<string, string[]>, 
  generalTerms: string[]
): boolean => {
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