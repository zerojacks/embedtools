#!/bin/bash

# Excel任务提取工具部署脚本
# 部署到 embedtools.icu 域名

set -e  # 遇到错误立即退出

# 配置变量
PROJECT_NAME="embedtools"
DOMAIN="embedtools.icu"
DEPLOY_PATH="/var/www/embedtools.icu"
BACKUP_PATH="/var/backups/embedtools.icu"
SERVICE_NAME="embedtools-app"
PORT=3000

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查是否为root用户
check_root() {
    if [[ $EUID -eq 0 ]]; then
        log_warning "检测到root用户，建议使用普通用户并配置sudo权限"
    fi
}

# 检查必要的工具
check_dependencies() {
    log_info "检查必要的编译工具和依赖..."
    
    local missing_tools=()
    
    # 检查Node.js
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    else
        local node_version=$(node --version | cut -d'v' -f2)
        local major_version=$(echo $node_version | cut -d'.' -f1)
        if [ "$major_version" -lt 18 ]; then
            log_warning "Node.js版本过低 ($node_version)，建议使用18+版本"
        else
            log_success "Node.js版本: $node_version ✓"
        fi
    fi
    
    # 检查npm
    if ! command -v npm &> /dev/null; then
        missing_tools+=("npm")
    else
        log_success "npm版本: $(npm --version) ✓"
    fi
    
    # 检查git
    if ! command -v git &> /dev/null; then
        missing_tools+=("git")
    else
        log_success "git版本: $(git --version) ✓"
    fi
    
    # 检查nginx
    if ! command -v nginx &> /dev/null; then
        missing_tools+=("nginx")
    else
        log_success "nginx版本: $(nginx -v 2>&1) ✓"
    fi
    
    # 检查pm2
    if ! command -v pm2 &> /dev/null; then
        log_warning "PM2未安装，将使用npm全局安装"
        npm install -g pm2
    else
        log_success "PM2版本: $(pm2 --version) ✓"
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "缺少必要工具: ${missing_tools[*]}"
        log_info "请先安装缺少的工具："
        for tool in "${missing_tools[@]}"; do
            case $tool in
                "node"|"npm")
                    echo "  - Node.js和npm: curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash - && sudo apt-get install -y nodejs"
                    ;;
                "git")
                    echo "  - Git: sudo apt-get install git"
                    ;;
                "nginx")
                    echo "  - Nginx: sudo apt-get install nginx"
                    ;;
            esac
        done
        exit 1
    fi
}

# 创建备份
create_backup() {
    if [ -d "$DEPLOY_PATH" ]; then
        log_info "创建当前部署的备份..."
        sudo mkdir -p "$BACKUP_PATH"
        local backup_name="backup-$(date +%Y%m%d-%H%M%S)"
        sudo cp -r "$DEPLOY_PATH" "$BACKUP_PATH/$backup_name"
        log_success "备份已创建: $BACKUP_PATH/$backup_name"
    fi
}

# 构建项目
build_project() {
    log_info "开始构建项目..."
    
    # 安装依赖
    log_info "安装项目依赖..."
    npm ci --production=false
    
    # 构建项目
    log_info "构建Next.js项目..."
    npm run build
    
    log_success "项目构建完成"
}

# 部署文件
deploy_files() {
    log_info "部署文件到服务器..."
    
    # 创建部署目录
    sudo mkdir -p "$DEPLOY_PATH"
    
    # 复制构建文件
    sudo cp -r .next "$DEPLOY_PATH/"
    sudo cp -r public "$DEPLOY_PATH/" 2>/dev/null || true
    sudo cp -r node_modules "$DEPLOY_PATH/"
    sudo cp package.json "$DEPLOY_PATH/"
    sudo cp package-lock.json "$DEPLOY_PATH/"
    sudo cp next.config.js "$DEPLOY_PATH/" 2>/dev/null || true
    
    # 设置权限
    sudo chown -R www-data:www-data "$DEPLOY_PATH"
    sudo chmod -R 755 "$DEPLOY_PATH"
    
    log_success "文件部署完成"
}

# 配置Nginx
configure_nginx() {
    log_info "配置Nginx..."
    
    local nginx_config="/etc/nginx/sites-available/$DOMAIN"
    
    sudo tee "$nginx_config" > /dev/null <<EOF
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    
    # 重定向到HTTPS (如果有SSL证书)
    # return 301 https://\$server_name\$request_uri;
    
    location / {
        proxy_pass http://localhost:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # 增加超时时间
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # 静态文件缓存
    location /_next/static/ {
        proxy_pass http://localhost:$PORT;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }
    
    # 文件上传大小限制
    client_max_body_size 50M;
    
    # Gzip压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/javascript application/xml+rss application/json;
}

# HTTPS配置 (如果有SSL证书，取消注释)
# server {
#     listen 443 ssl http2;
#     server_name $DOMAIN www.$DOMAIN;
#     
#     ssl_certificate /path/to/your/certificate.crt;
#     ssl_certificate_key /path/to/your/private.key;
#     
#     # SSL配置
#     ssl_protocols TLSv1.2 TLSv1.3;
#     ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384;
#     ssl_prefer_server_ciphers off;
#     
#     location / {
#         proxy_pass http://localhost:$PORT;
#         proxy_http_version 1.1;
#         proxy_set_header Upgrade \$http_upgrade;
#         proxy_set_header Connection 'upgrade';
#         proxy_set_header Host \$host;
#         proxy_set_header X-Real-IP \$remote_addr;
#         proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
#         proxy_set_header X-Forwarded-Proto \$scheme;
#         proxy_cache_bypass \$http_upgrade;
#     }
# }
EOF
    
    # 启用站点
    sudo ln -sf "$nginx_config" "/etc/nginx/sites-enabled/$DOMAIN"
    
    # 删除默认站点（如果存在）
    sudo rm -f /etc/nginx/sites-enabled/default
    
    # 测试Nginx配置
    if sudo nginx -t; then
        log_success "Nginx配置验证通过"
        sudo systemctl reload nginx
        log_success "Nginx已重新加载"
    else
        log_error "Nginx配置验证失败"
        exit 1
    fi
}

# 配置PM2
configure_pm2() {
    log_info "配置PM2应用..."
    
    # 创建PM2配置文件
    local pm2_config="$DEPLOY_PATH/ecosystem.config.js"
    
    sudo tee "$pm2_config" > /dev/null <<EOF
module.exports = {
  apps: [{
    name: '$SERVICE_NAME',
    script: 'npm',
    args: 'start',
    cwd: '$DEPLOY_PATH',
    instances: 1, // 暂时使用1个实例
    exec_mode: 'fork', // 使用 fork 模式
    env: {
      NODE_ENV: 'production',
      PORT: $PORT
    },
    error_file: '/var/log/pm2/$SERVICE_NAME-error.log',
    out_file: '/var/log/pm2/$SERVICE_NAME-out.log',
    log_file: '/var/log/pm2/$SERVICE_NAME.log',
    time: true,
    max_memory_restart: '1G',
    node_args: '--max-old-space-size=1024'
  }]
};
EOF
    
    # 创建日志目录
    sudo mkdir -p /var/log/pm2
    sudo chown -R www-data:www-data /var/log/pm2
    
    # 切换到部署目录
    cd "$DEPLOY_PATH"

    # 获取运行实例数量
    # 使用 pm2 jlist 获取 JSON 列表并统计名称出现次数，以处理 Cluster 模式遗留的多实例问题
    local instance_count=$(pm2 jlist | grep -o "\"name\":\"$SERVICE_NAME\"" | wc -l)

    if [ "$instance_count" -gt 1 ]; then
        log_warning "检测到多个 $SERVICE_NAME 实例(数量: $instance_count)，正在清理并重新启动以确保单实例模式..."
        pm2 delete "$SERVICE_NAME" 2>/dev/null || true
        pm2 start ecosystem.config.js
    elif [ "$instance_count" -eq 1 ]; then
        log_info "应用 $SERVICE_NAME 已存在，正在重启..."
        pm2 reload "$SERVICE_NAME" --update-env
    else
        log_info "应用 $SERVICE_NAME 不存在，正在启动..."
        pm2 start ecosystem.config.js
    fi
    
    pm2 save
    
    # 设置PM2开机自启
    pm2 startup systemd -u www-data --hp /var/www
    
    log_success "PM2应用配置完成"
}

# 健康检查
health_check() {
    log_info "执行健康检查..."
    
    # 等待应用启动
    sleep 10
    
    # 检查端口是否监听
    if netstat -tuln | grep ":$PORT " > /dev/null; then
        log_success "应用已在端口 $PORT 上运行"
    else
        log_error "应用未在端口 $PORT 上运行"
        pm2 logs "$SERVICE_NAME" --lines 20
        exit 1
    fi
    
    # 检查HTTP响应
    if curl -f -s "http://localhost:$PORT" > /dev/null; then
        log_success "应用HTTP响应正常"
    else
        log_warning "应用HTTP响应异常，请检查日志"
        pm2 logs "$SERVICE_NAME" --lines 10
    fi
    
    # 显示PM2状态
    pm2 status
}

# 显示部署信息
show_deployment_info() {
    log_success "部署完成！"
    echo
    echo "==================================="
    echo "  Excel任务提取工具部署信息"
    echo "==================================="
    echo "域名: http://$DOMAIN"
    echo "本地访问: http://localhost:$PORT"
    echo "部署路径: $DEPLOY_PATH"
    echo "服务名称: $SERVICE_NAME"
    echo
    echo "常用命令："
    echo "  查看应用状态: pm2 status"
    echo "  查看应用日志: pm2 logs $SERVICE_NAME"
    echo "  重启应用: pm2 restart $SERVICE_NAME"
    echo "  停止应用: pm2 stop $SERVICE_NAME"
    echo "  重新加载Nginx: sudo systemctl reload nginx"
    echo
    echo "日志文件："
    echo "  应用日志: /var/log/pm2/$SERVICE_NAME.log"
    echo "  Nginx日志: /var/log/nginx/access.log"
    echo "  Nginx错误日志: /var/log/nginx/error.log"
    echo "==================================="
}

# 主函数
main() {
    log_info "开始部署Excel任务提取工具到 $DOMAIN"
    
    check_root
    check_dependencies
    create_backup
    build_project
    deploy_files
    configure_nginx
    configure_pm2
    health_check
    show_deployment_info
    
    log_success "部署流程全部完成！"
}

# 执行主函数
main "$@"