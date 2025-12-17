import { useState } from 'react';
import { Task } from '@/types/task';

export const useTaskSelection = () => {
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set());

  // 获取任务的唯一标识
  const getTaskKey = (task: Task): string => {
    return `${task.worksheet}-${task.taskNumber}-${task.columnIndex}`;
  };

  // 获取选中的任务列表
  const getSelectedTasks = (allTasks: Task[]): Task[] => {
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
  const toggleSelectAll = (filteredTasks: Task[]) => {
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

  return {
    selectedTasks,
    getTaskKey,
    getSelectedTasks,
    toggleTaskSelection,
    toggleSelectAll
  };
};