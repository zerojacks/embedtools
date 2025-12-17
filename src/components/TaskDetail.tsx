import React from 'react';
import { Task } from '@/types/task';
import InfoItem from './InfoItem';

interface TaskDetailProps {
  task: Task;
  expandedMeasurementPoints: Set<string>;
  setExpandedMeasurementPoints: (expanded: Set<string>) => void;
  showCheckbox?: boolean;
  selectedTasks?: Set<string>;
  toggleTaskSelection?: (task: Task) => void;
  getTaskKey?: (task: Task) => string;
}

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
              onChange={(e) => {
                e.stopPropagation();
                toggleTaskSelection(task);
              }}
              onClick={(e) => e.stopPropagation()}
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
          highlight
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
          highlight
        />
        <InfoItem
          label="采样周期单位"
          value={task.samplingPeriodUnit}
          originalValue={task.samplingPeriodUnitOriginal}
          highlight
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
          highlight
        />
        <InfoItem
          label="上报周期单位"
          value={task.reportPeriodUnit}
          originalValue={task.reportPeriodUnitOriginal}
          highlight
        />
        <InfoItem
          label="数据抽取倍率"
          value={task.extractionRatio}
          originalValue={task.extractionRatioOriginal}
          highlight
        />
        <InfoItem 
          label="执行次数" 
          value={task.executionCount} 
          highlight
        />
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

export default TaskDetail;