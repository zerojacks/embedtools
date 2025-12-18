import Link from 'next/link';
import Head from 'next/head';
import {
  FileText,
  Zap,
  Code,
  Settings,
  Database,
  Wifi,
  Shield,
  Monitor,
  ChevronRight,
  Github,
  Mail,
  Globe
} from 'lucide-react';
import { EmbedToolsSVGLogo } from '@/components/Logo';

// 工具卡片组件
const ToolCard = ({
  icon: Icon,
  title,
  description,
  href,
  status = 'available',
  gradient
}: {
  icon: any;
  title: string;
  description: string;
  href: string;
  status?: 'available' | 'coming-soon';
  gradient: string;
}) => {
  const CardContent = () => (
    <div className={`
      group relative overflow-hidden rounded-xl p-6 h-full
      bg-white border border-gray-200 hover:border-gray-300
      hover:shadow-xl transition-all duration-300 cursor-pointer
      ${status === 'coming-soon' ? 'opacity-75' : ''}
    `}>
      {/* 背景渐变效果 */}
      <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-300 ${gradient}`}></div>

      {/* 状态标签 */}
      {status === 'coming-soon' && (
        <div className="absolute top-4 right-4 bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
          即将推出
        </div>
      )}

      <div className="relative z-10">
        <div className={`inline-flex p-3 rounded-lg mb-4 ${gradient.replace('bg-gradient-to-br', 'bg-gradient-to-br')}`}>
          <Icon className="text-white" size={24} />
        </div>

        <h3 className="text-xl font-semibold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">
          {title}
        </h3>

        <p className="text-gray-600 text-sm mb-4 leading-relaxed">
          {description}
        </p>

        <div className="flex items-center text-blue-600 text-sm font-medium">
          <span>了解更多</span>
          <ChevronRight size={16} className="ml-1 group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );

  if (status === 'coming-soon') {
    return <div className="h-full"><CardContent /></div>;
  }

  return (
    <Link href={href} className="block h-full">
      <CardContent />
    </Link>
  );
};

export default function Home() {
  const tools = [
    {
      icon: FileText,
      title: 'Excel任务提取器',
      description: '智能识别Excel结构，自动提取任务定义、测量点范围和配置参数，支持多种导出格式。',
      href: '/task-extract',
      status: 'available' as const,
      gradient: 'bg-gradient-to-br from-blue-500 to-indigo-600'
    },
    {
      icon: Code,
      title: '代码生成器',
      description: '基于配置文件自动生成嵌入式C/C++代码模板，支持多种MCU平台和外设驱动。',
      href: '/code-generator',
      status: 'coming-soon' as const,
      gradient: 'bg-gradient-to-br from-green-500 to-emerald-600'
    },
    {
      icon: Settings,
      title: '配置文件转换',
      description: '在不同配置格式间转换：JSON、XML、INI、YAML等，支持嵌入式项目配置管理。',
      href: '/config-converter',
      status: 'coming-soon' as const,
      gradient: 'bg-gradient-to-br from-purple-500 to-violet-600'
    },
    {
      icon: Database,
      title: '数据解析器',
      description: '解析和转换各种嵌入式数据格式：HEX、BIN、CSV等，支持数据可视化分析。',
      href: '/data-parser',
      status: 'coming-soon' as const,
      gradient: 'bg-gradient-to-br from-orange-500 to-red-600'
    },
    {
      icon: Wifi,
      title: '通信协议工具',
      description: '串口、SPI、I2C、CAN等通信协议的调试和测试工具，支持协议解析和模拟。',
      href: '/protocol-tools',
      status: 'coming-soon' as const,
      gradient: 'bg-gradient-to-br from-cyan-500 to-blue-600'
    },
    {
      icon: Shield,
      title: '固件分析器',
      description: '分析嵌入式固件文件，提取版本信息、依赖关系和安全检查。',
      href: '/firmware-analyzer',
      status: 'coming-soon' as const,
      gradient: 'bg-gradient-to-br from-rose-500 to-pink-600'
    },
    {
      icon: Monitor,
      title: '性能监控',
      description: '实时监控嵌入式设备性能指标，内存使用、CPU占用率等系统资源分析。',
      href: '/performance-monitor',
      status: 'coming-soon' as const,
      gradient: 'bg-gradient-to-br from-teal-500 to-cyan-600'
    },
    {
      icon: Zap,
      title: '功耗计算器',
      description: '计算和优化嵌入式系统功耗，支持不同工作模式下的功耗评估和建议。',
      href: '/power-calculator',
      status: 'coming-soon' as const,
      gradient: 'bg-gradient-to-br from-yellow-500 to-orange-600'
    }
  ];

  return (
    <>
      <Head>
        <title>EmbedTools - 嵌入式开发工具集</title>
        <meta name="description" content="专为嵌入式开发工程师打造的在线工具平台，提供代码生成、数据转换、协议调试等实用工具" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon-simple.svg" type="image/svg+xml" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#2563eb" />
        <meta property="og:title" content="EmbedTools - 嵌入式开发工具集" />
        <meta property="og:description" content="专为嵌入式开发工程师打造的在线工具平台" />
        <meta property="og:url" content="https://embedtools.icu" />
        <meta property="og:type" content="website" />
        <meta property="og:image" content="https://embedtools.icu/favicon.svg" />
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* 头部导航 */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <EmbedToolsSVGLogo size={48} />

              <nav className="hidden md:flex items-center space-x-8">
                <a href="#tools" className="text-gray-600 hover:text-blue-600 transition-colors">工具集</a>
                <a href="#about" className="text-gray-600 hover:text-blue-600 transition-colors">关于</a>
                <a href="https://github.com" className="text-gray-600 hover:text-blue-600 transition-colors flex items-center gap-2">
                  <Github size={18} />
                  GitHub
                </a>
              </nav>
            </div>
          </div>
        </header>

        {/* 主要内容 */}
        <main>
          {/* Hero 区域 */}
          <section className="py-20 px-6">
            <div className="max-w-7xl mx-auto text-center">
              <div className="mb-8">
                <EmbedToolsSVGLogo size={80} />
              </div>

              <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
                <span className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent">
                  嵌入式开发
                </span>
                <br />
                <span className="text-gray-800">工具集合</span>
              </h1>

              <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                专为嵌入式开发工程师打造的在线工具平台，提供代码生成、数据转换、协议调试等实用工具，
                让嵌入式开发更加高效便捷。
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link
                  href="/task-extract"
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg hover:shadow-xl"
                >
                  开始使用工具
                </Link>
                <a
                  href="#tools"
                  className="border-2 border-blue-600 text-blue-600 px-8 py-4 rounded-xl font-semibold hover:bg-blue-600 hover:text-white transition-all duration-300"
                >
                  浏览所有工具
                </a>
              </div>
            </div>
          </section>

          {/* 工具展示区域 */}
          <section id="tools" className="py-20 px-6 bg-white/50">
            <div className="max-w-7xl mx-auto">
              <div className="text-center mb-16">
                <h2 className="text-4xl font-bold text-gray-900 mb-4">
                  专业工具集
                </h2>
                <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                  涵盖嵌入式开发全流程的实用工具，从代码生成到性能优化，一站式解决开发需求
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {tools.map((tool, index) => (
                  <ToolCard key={index} {...tool} />
                ))}
              </div>
            </div>
          </section>

          {/* 关于区域 */}
          <section id="about" className="py-20 px-6">
            <div className="max-w-4xl mx-auto text-center">
              <h2 className="text-4xl font-bold text-gray-900 mb-8">
                为什么选择 EmbedTools？
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                <div className="p-6">
                  <div className="bg-gradient-to-br from-blue-500 to-indigo-600 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Zap className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">高效便捷</h3>
                  <p className="text-gray-600">在线工具，无需安装，随时随地使用，大幅提升开发效率</p>
                </div>

                <div className="p-6">
                  <div className="bg-gradient-to-br from-green-500 to-emerald-600 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Shield className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">专业可靠</h3>
                  <p className="text-gray-600">专为嵌入式开发设计，经过实际项目验证，确保工具的专业性</p>
                </div>

                <div className="p-6">
                  <div className="bg-gradient-to-br from-purple-500 to-violet-600 w-16 h-16 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Code className="text-white" size={32} />
                  </div>
                  <h3 className="text-xl font-semibold text-gray-900 mb-2">持续更新</h3>
                  <p className="text-gray-600">根据开发者反馈持续优化，定期添加新工具和功能</p>
                </div>
              </div>
            </div>
          </section>
        </main>

        {/* 页脚 */}
        <footer className="bg-gray-900 text-white py-12 px-6">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <div className="mb-6 md:mb-0">
                <EmbedToolsSVGLogo size={40} />
                <p className="text-gray-400 mt-2">让嵌入式开发更简单</p>
              </div>

              <div className="flex items-center space-x-6">
                <a href="mailto:contact@embedtools.icu" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <Mail size={18} />
                  联系我们
                </a>
                <a href="https://embedtools.icu" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                  <Globe size={18} />
                  embedtools.icu
                </a>
              </div>
            </div>

            <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
              <p>&copy; 2024 EmbedTools. 专注嵌入式开发工具.</p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}