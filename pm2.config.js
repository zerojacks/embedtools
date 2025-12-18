// PM2配置文件
// 使用方法: pm2 start pm2.config.js

module.exports = {
  apps: [{
    name: 'embedtools-app',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/embedtools.icu',
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster', // 集群模式
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // 日志配置
    error_file: '/var/log/pm2/embedtools-error.log',
    out_file: '/var/log/pm2/embedtools-out.log',
    log_file: '/var/log/pm2/embedtools.log',
    time: true,
    
    // 性能配置
    max_memory_restart: '1G', // 内存超过1G时重启
    node_args: '--max-old-space-size=1024',
    
    // 自动重启配置
    watch: false, // 生产环境不建议开启文件监听
    ignore_watch: ['node_modules', 'logs'],
    
    // 健康检查
    min_uptime: '10s',
    max_restarts: 10,
    
    // 其他配置
    kill_timeout: 5000,
    wait_ready: true,
    listen_timeout: 10000
  }]
};