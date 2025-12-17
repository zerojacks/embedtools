import React, { useState } from 'react';
import { Upload, FileText, Download, Search, AlertCircle, CheckCircle } from 'lucide-react';

// 导入类型
import { Task } from '@/types/task';

// 导入组件
import TaskDetail from '@/components/TaskDetail';
import TaskPreview from '@/components/TaskPreview';

// 导入自定义hooks
import { useTaskExtractor } from '@/hooks/useTaskExtractor';
import { useTaskSelection } from '@/hooks/useTaskSelection';

// 导入工具函数
import { parseSearchQuery, matchesSearchCriteria } from '@/utils/searchUtils';
import { exportToJSON, exportToINI, exportToTaskTemplate } from '@/utils/exportUtils';

const TaskExtractor = () => {
  // 使用自定义hooks
  const {
    extractedData,
    fileName,
    stats,
    loading,
    error,
    handleFileUpload
  } = useTaskExtractor();

  const {
    selectedTasks,
    getTaskKey,
    getSelectedTasks,
    toggleTaskSelection,
    toggleSelectAll
  } = useTaskSelection();

  // 本地状态
  const [searchText, setSearchText] = useState<string>('');
  const [selectedSheet, setSelectedSheet] = useState<string>('all');
  const [expandedMeasurementPoints, setExpandedMeasurementPoints] = useState<Set<string>>(new Set());
  const [previewTask, setPreviewTask] = useState<Task | null>(null);

  // 获取当前显示的任务列表
  const getCurrentTasks = () => {
    if (selectedSheet === 'all') {
      // 合并所有sheet的任务
      return Object.values(extractedData).flat();
    } else {
      return extractedData[selectedSheet] || [];
    }
  };

  // 搜索和筛选逻辑
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
                  onClick={() => exportToINI(extractedData)}
                  className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors"
                >
                  <Download size={18} />
                  导出INI格式
                </button>
                <button
                  onClick={() => exportToJSON(extractedData)}
                  className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Download size={18} />
                  导出JSON格式
                </button>
                <button
                  onClick={() => {
                    const tasksToExport = selectedTasks.size > 0
                      ? getSelectedTasks(getCurrentTasks())
                      : getCurrentTasks();
                    exportToTaskTemplate(tasksToExport);
                  }}
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
                      onClick={() => toggleSelectAll(filteredData)}
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
                <div
                  key={`${task.worksheet}-${task.taskNumber}-${index}`}
                  onClick={() => setPreviewTask(task)}
                  className="cursor-pointer"
                >
                  <TaskDetail
                    task={task}
                    expandedMeasurementPoints={expandedMeasurementPoints}
                    setExpandedMeasurementPoints={setExpandedMeasurementPoints}
                    showCheckbox={true}
                    selectedTasks={selectedTasks}
                    toggleTaskSelection={toggleTaskSelection}
                    getTaskKey={getTaskKey}
                  />
                </div>
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
                  {getSelectedTasks(getCurrentTasks()).map((task) => (
                    <div
                      key={getTaskKey(task)}
                      className="p-3 rounded-lg border cursor-pointer transition-colors border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                      onClick={(e) => {
                        // 检查点击的是否是删除按钮
                        if ((e.target as HTMLElement).closest('button')) {
                          console.log('点击了删除按钮，不触发预览');
                          return;
                        }
                        console.log('点击任务项，显示预览:', task.taskName, task.taskNumber);
                        setPreviewTask(task);
                      }}
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
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              console.log('预览按钮点击');
                              e.stopPropagation();
                              setPreviewTask(task);
                            }}
                            className="bg-blue-500 text-white px-2 py-1 rounded text-xs hover:bg-blue-600"
                          >
                            预览
                          </button>
                          <button
                            onClick={(e) => {
                              console.log('删除按钮点击');
                              e.stopPropagation();
                              toggleTaskSelection(task);
                            }}
                            className="text-red-500 hover:text-red-700 text-xs"
                          >
                            ✕
                          </button>
                        </div>
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

export default TaskExtractor;