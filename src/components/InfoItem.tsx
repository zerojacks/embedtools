import React from 'react';

interface InfoItemProps {
  label: string;
  value: string | number | null;
  originalValue?: string;
  highlight?: boolean;
}

const InfoItem: React.FC<InfoItemProps> = ({ 
  label, 
  value, 
  originalValue, 
  highlight = false 
}) => (
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

export default InfoItem;