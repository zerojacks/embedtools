import { Task } from '@/types/task';

/**
 * 导出为JSON格式
 */
export const exportToJSON = (extractedData: Record<string, Task[]>) => {
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

/**
 * 导出为INI格式
 */
export const exportToINI = (extractedData: Record<string, Task[]>) => {
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

/**
 * 导出为任务模板格式
 */
export const exportToTaskTemplate = (tasks: Task[]) => {
  // 根据任务类型分类任务
  const baseTasks: Array<{ TaskId: number, TaskParam: string }> = [];
  const meterTasks: Array<{ TaskId: number, TaskParam: string }> = [];

  tasks.forEach(task => {
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