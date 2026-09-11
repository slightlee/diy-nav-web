#!/bin/bash

# =============================================================================
# 远程服务器 Docker 部署脚本
# 特性：多线程压缩、SSH 连接复用、进度显示
# =============================================================================

set -e

# ======================== 配置区域 ========================
REMOTE_USER="root"
REMOTE_HOST="$DB_HOST"
PEM_KEY_PATH="$HOME/local/ssh/bj-47.pem"
REMOTE_DIR="/opt/diy-nav-web"

# 获取项目根目录（在任何函数执行前确定）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
# ==========================================================

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${CYAN}[STEP]${NC} $1"; }

# SSH 连接复用配置
SSH_CONTROL_PATH="/tmp/ssh-deploy-%r@%h:%p"
SSH_OPTS="-i $PEM_KEY_PATH -o StrictHostKeyChecking=no -o ControlMaster=auto -o ControlPath=$SSH_CONTROL_PATH -o ControlPersist=300"
SSH_CMD="ssh $SSH_OPTS $REMOTE_USER@$REMOTE_HOST"
SCP_CMD="scp $SSH_OPTS"

# 检测可用工具
COMPRESS_CMD="gzip"
DECOMPRESS_CMD="gunzip"
if command -v pigz &> /dev/null; then
    COMPRESS_CMD="pigz -9"    # 多线程压缩
    DECOMPRESS_CMD="pigz -d"
    log_info "使用 pigz 多线程压缩"
fi

# 进度显示
PROGRESS_CMD="cat"
if command -v pv &> /dev/null; then
    PROGRESS_CMD="pv"
    log_info "使用 pv 显示传输进度"
fi

# 获取版本标签
get_tag() {
    git describe --tags --exact-match 2>/dev/null || git rev-parse --short HEAD
}

# 检查环境
check_prerequisites() {
    log_step "检查本地环境..."
    
    command -v docker &> /dev/null || { log_error "Docker 未安装"; exit 1; }
    [ -f "$PEM_KEY_PATH" ] || { log_error "密钥不存在: $PEM_KEY_PATH"; exit 1; }
    chmod 400 "$PEM_KEY_PATH"
    
    # 检查远程环境
    log_step "验证 SSH 连接..."
    $SSH_CMD "docker --version" &>/dev/null || { log_error "SSH 连接失败或远程 Docker 未安装"; exit 1; }
    
    # 检查远程是否有解压工具
    if ! $SSH_CMD "command -v pigz" &>/dev/null; then
        DECOMPRESS_CMD="gunzip"
        log_warn "远程服务器无 pigz，使用 gunzip 解压"
    fi
    
    log_info "环境检查通过"
}

# 本地构建镜像
build_images() {
    log_step "构建 Docker 镜像..."
    
    # 确保使用本地 Docker 构建
    docker context use default &>/dev/null || true
    
    cd "$PROJECT_ROOT"
    
    TAG=$(get_tag)
    log_info "版本: $TAG"
    
    TAG=$TAG docker compose --env-file "$PROJECT_ROOT/.env" -f "$PROJECT_ROOT/deploy/docker-compose.yml" build
    
    log_info "镜像构建完成"
}

# 传输镜像（优化版）
transfer_images() {
    log_step "传输镜像到远程服务器..."
    
    TAG=$(get_tag)
    
    # 获取镜像大小用于进度显示
    IMAGE_SIZE=$(docker image inspect nav-web:$TAG nav-api:$TAG --format='{{.Size}}' | awk '{s+=$1} END {print s}')
    IMAGE_SIZE_MB=$((IMAGE_SIZE / 1024 / 1024))
    log_info "镜像大小: ~${IMAGE_SIZE_MB}MB（压缩后更小）"
    
    # 多线程压缩 + 进度显示 + SSH 传输
    if [ "$PROGRESS_CMD" = "pv" ]; then
        docker save nav-web:$TAG nav-api:$TAG | $COMPRESS_CMD | pv -s $IMAGE_SIZE | $SSH_CMD "$DECOMPRESS_CMD | docker load"
    else
        docker save nav-web:$TAG nav-api:$TAG | $COMPRESS_CMD | $SSH_CMD "$DECOMPRESS_CMD | docker load"
    fi
    
    log_info "镜像传输完成"
}

# 传输配置文件
transfer_config() {
    log_step "传输配置文件..."
    
    $SSH_CMD "mkdir -p $REMOTE_DIR/deploy"
    $SCP_CMD "$PROJECT_ROOT/.env" $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/
    $SCP_CMD "$PROJECT_ROOT/deploy/docker-compose.yml" $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/deploy/
    $SCP_CMD "$PROJECT_ROOT/deploy/docker-compose.mysql.yml" $REMOTE_USER@$REMOTE_HOST:$REMOTE_DIR/deploy/
    
    log_info "配置文件传输完成"
}

# 启动容器
start_containers() {
    log_step "启动容器..."
    
    TAG=$(get_tag)
    COMPOSE_FILES="-f deploy/docker-compose.yml"
    CONFIGURED_DB_PROVIDER=$(sed -n 's/^DB_PROVIDER=//p' "$PROJECT_ROOT/.env" | tail -n 1 | tr -d '\r')

    if [ "$CONFIGURED_DB_PROVIDER" = "mysql" ]; then
        COMPOSE_FILES="$COMPOSE_FILES -f deploy/docker-compose.mysql.yml"
        log_info "数据库提供商: MySQL（启用 mysql_default 共享网络）"
    else
        log_info "数据库提供商: D1"
    fi
    
    # 停止旧容器并启动新容器（显式指定 .env 路径）
    $SSH_CMD "cd $REMOTE_DIR && TAG=$TAG docker compose --env-file .env $COMPOSE_FILES up -d --remove-orphans"
    
    # 清理旧镜像
    $SSH_CMD "docker image prune -f" &>/dev/null || true
    
    log_info "容器启动完成"
}

# 清理 SSH 连接
cleanup() {
    ssh -O exit -o ControlPath=$SSH_CONTROL_PATH $REMOTE_USER@$REMOTE_HOST 2>/dev/null || true
}

# 主流程
main() {
    trap cleanup EXIT
    
    echo ""
    echo -e "${CYAN}╔════════════════════════════════════════╗${NC}"
    echo -e "${CYAN}║     远程服务器 Docker 部署                ║${NC}"
    echo -e "${CYAN}╚════════════════════════════════════════╝${NC}"
    echo ""
    
    START_TIME=$(date +%s)
    
    check_prerequisites
    build_images
    transfer_images
    transfer_config
    start_containers
    
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))
    
    echo ""
    log_info "🎉 部署完成！耗时: ${DURATION}s"
    log_info "🌐 Web: http://$REMOTE_HOST:3000"
    log_info "🔌 API: http://$REMOTE_HOST:8787/healthz"
}

main "$@"
