import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  showText?: boolean;
}

// SVG Logo 组件
export const EmbedToolsSVGLogo: React.FC<LogoProps> = ({ 
  size = 40, 
  className = "",
  showText = true 
}) => {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 48 48" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* 定义渐变 */}
        <defs>
          <linearGradient id="chipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="100%" stopColor="#2563eb" />
          </linearGradient>
          <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#2563eb" stopOpacity="0.3" />
          </linearGradient>
        </defs>
        
        {/* 发光效果背景 */}
        <rect 
          x="6" 
          y="6" 
          width="36" 
          height="36" 
          rx="6" 
          fill="url(#glowGradient)"
          filter="blur(2px)"
        />
        
        {/* 主芯片形状 */}
        <rect 
          x="8" 
          y="8" 
          width="32" 
          height="32" 
          rx="4" 
          fill="url(#chipGradient)"
        />
        
        {/* 芯片引脚 - 左侧 */}
        <rect x="2" y="14" width="6" height="2" rx="1" fill="#9ca3af" />
        <rect x="2" y="18" width="6" height="2" rx="1" fill="#9ca3af" />
        <rect x="2" y="22" width="6" height="2" rx="1" fill="#9ca3af" />
        <rect x="2" y="26" width="6" height="2" rx="1" fill="#9ca3af" />
        
        {/* 芯片引脚 - 右侧 */}
        <rect x="40" y="14" width="6" height="2" rx="1" fill="#9ca3af" />
        <rect x="40" y="18" width="6" height="2" rx="1" fill="#9ca3af" />
        <rect x="40" y="22" width="6" height="2" rx="1" fill="#9ca3af" />
        <rect x="40" y="26" width="6" height="2" rx="1" fill="#9ca3af" />
        
        {/* 芯片引脚 - 上侧 */}
        <rect x="14" y="2" width="2" height="6" rx="1" fill="#9ca3af" />
        <rect x="18" y="2" width="2" height="6" rx="1" fill="#9ca3af" />
        <rect x="26" y="2" width="2" height="6" rx="1" fill="#9ca3af" />
        <rect x="30" y="2" width="2" height="6" rx="1" fill="#9ca3af" />
        
        {/* 芯片引脚 - 下侧 */}
        <rect x="14" y="40" width="2" height="6" rx="1" fill="#9ca3af" />
        <rect x="18" y="40" width="2" height="6" rx="1" fill="#9ca3af" />
        <rect x="26" y="40" width="2" height="6" rx="1" fill="#9ca3af" />
        <rect x="30" y="40" width="2" height="6" rx="1" fill="#9ca3af" />
        
        {/* 芯片内部电路图案 */}
        <g fill="white" fillOpacity="0.9">
          {/* 中心处理器图标 */}
          <rect x="20" y="20" width="8" height="8" rx="1" fill="white" fillOpacity="0.2" />
          <rect x="22" y="22" width="4" height="4" rx="0.5" fill="white" />
          
          {/* 电路连线 */}
          <rect x="12" y="23" width="8" height="1" fill="white" fillOpacity="0.6" />
          <rect x="28" y="23" width="8" height="1" fill="white" fillOpacity="0.6" />
          <rect x="23" y="12" width="1" height="8" fill="white" fillOpacity="0.6" />
          <rect x="23" y="28" width="1" height="8" fill="white" fillOpacity="0.6" />
          
          {/* 小电路点 */}
          <circle cx="15" cy="15" r="1" fill="white" fillOpacity="0.8" />
          <circle cx="33" cy="15" r="1" fill="white" fillOpacity="0.8" />
          <circle cx="15" cy="33" r="1" fill="white" fillOpacity="0.8" />
          <circle cx="33" cy="33" r="1" fill="white" fillOpacity="0.8" />
        </g>
      </svg>
      
      {showText && (
        <div className="flex flex-col">
          <span className="text-2xl font-bold bg-gradient-to-r from-cyan-600 to-blue-600 bg-clip-text text-transparent">
            EmbedTools
          </span>
          <span className="text-xs text-gray-500 -mt-1">嵌入式开发工具集</span>
        </div>
      )}
    </div>
  );
};

// 纯 SVG 字符串导出（用于生成 favicon）
export const logoSVGString = `
<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="chipGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" />
      <stop offset="100%" stop-color="#2563eb" />
    </linearGradient>
    <linearGradient id="glowGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22d3ee" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#2563eb" stop-opacity="0.3" />
    </linearGradient>
  </defs>
  
  <rect x="6" y="6" width="36" height="36" rx="6" fill="url(#glowGradient)" filter="blur(2px)" />
  <rect x="8" y="8" width="32" height="32" rx="4" fill="url(#chipGradient)" />
  
  <!-- 芯片引脚 -->
  <rect x="2" y="14" width="6" height="2" rx="1" fill="#9ca3af" />
  <rect x="2" y="18" width="6" height="2" rx="1" fill="#9ca3af" />
  <rect x="2" y="22" width="6" height="2" rx="1" fill="#9ca3af" />
  <rect x="2" y="26" width="6" height="2" rx="1" fill="#9ca3af" />
  
  <rect x="40" y="14" width="6" height="2" rx="1" fill="#9ca3af" />
  <rect x="40" y="18" width="6" height="2" rx="1" fill="#9ca3af" />
  <rect x="40" y="22" width="6" height="2" rx="1" fill="#9ca3af" />
  <rect x="40" y="26" width="6" height="2" rx="1" fill="#9ca3af" />
  
  <rect x="14" y="2" width="2" height="6" rx="1" fill="#9ca3af" />
  <rect x="18" y="2" width="2" height="6" rx="1" fill="#9ca3af" />
  <rect x="26" y="2" width="2" height="6" rx="1" fill="#9ca3af" />
  <rect x="30" y="2" width="2" height="6" rx="1" fill="#9ca3af" />
  
  <rect x="14" y="40" width="2" height="6" rx="1" fill="#9ca3af" />
  <rect x="18" y="40" width="2" height="6" rx="1" fill="#9ca3af" />
  <rect x="26" y="40" width="2" height="6" rx="1" fill="#9ca3af" />
  <rect x="30" y="40" width="2" height="6" rx="1" fill="#9ca3af" />
  
  <!-- 芯片内部电路 -->
  <rect x="20" y="20" width="8" height="8" rx="1" fill="white" fill-opacity="0.2" />
  <rect x="22" y="22" width="4" height="4" rx="0.5" fill="white" />
  
  <rect x="12" y="23" width="8" height="1" fill="white" fill-opacity="0.6" />
  <rect x="28" y="23" width="8" height="1" fill="white" fill-opacity="0.6" />
  <rect x="23" y="12" width="1" height="8" fill="white" fill-opacity="0.6" />
  <rect x="23" y="28" width="1" height="8" fill="white" fill-opacity="0.6" />
  
  <circle cx="15" cy="15" r="1" fill="white" fill-opacity="0.8" />
  <circle cx="33" cy="15" r="1" fill="white" fill-opacity="0.8" />
  <circle cx="15" cy="33" r="1" fill="white" fill-opacity="0.8" />
  <circle cx="33" cy="33" r="1" fill="white" fill-opacity="0.8" />
</svg>
`;

export default EmbedToolsSVGLogo;