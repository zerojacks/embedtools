import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';
import { Task } from '@/types/task';
import TaskDetail from './TaskDetail';

interface TaskPreviewProps {
  task: Task | null;
  onClose: () => void;
  expandedMeasurementPoints: Set<string>;
  setExpandedMeasurementPoints: (expanded: Set<string>) => void;
}

const TaskPreview: React.FC<TaskPreviewProps> = ({
  task,
  onClose,
  expandedMeasurementPoints,
  setExpandedMeasurementPoints
}) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  // 使用useCallback优化性能
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (task) {
      // 使用requestAnimationFrame确保流畅显示
      requestAnimationFrame(() => {
        dialog.showModal();
      });
    } else {
      dialog.close();
    }

    // 处理ESC键和点击外部关闭
    dialog.addEventListener('close', handleClose);
    dialog.addEventListener('cancel', handleClose);

    return () => {
      dialog.removeEventListener('close', handleClose);
      dialog.removeEventListener('cancel', handleClose);
    };
  }, [task, handleClose]);

  // 如果没有task，返回隐藏的dialog
  if (!task) {
    return <dialog ref={dialogRef} className="hidden" />;
  }

  return (
    <dialog
      ref={dialogRef}
      className="p-0 rounded-lg shadow-2xl border border-gray-200 max-w-4xl w-full max-h-[90vh] overflow-hidden backdrop:bg-black backdrop:bg-opacity-50"
      onClick={(e) => {
        // 点击dialog背景关闭
        if (e.target === e.currentTarget) {
          handleClose();
        }
      }}
    >
      {/* 简化的头部 - 只保留关闭按钮 */}
      <div className="flex justify-end p-2 bg-gray-50 rounded-t-lg">
        <button
          onClick={handleClose}
          className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <X className="w-5 h-5 text-gray-500" />
        </button>
      </div>

      {/* 内容区域 - 使用完整的TaskDetail组件 */}
      <div className="overflow-y-auto max-h-[calc(90vh-60px)] bg-white">
        <TaskDetail
          task={task}
          expandedMeasurementPoints={expandedMeasurementPoints}
          setExpandedMeasurementPoints={setExpandedMeasurementPoints}
          showCheckbox={false}
        />
      </div>
    </dialog>
  );
};

export default TaskPreview;