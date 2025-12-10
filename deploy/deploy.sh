#!/bin/bash

# 尝试获取当前 commit 的 Git Tag (例如 v1.0.0)
TAG=$(git describe --tags --exact-match 2>/dev/null)

# 如果没有 Tag，则降级使用 Git Commit SHA (例如 a1b2c3d)
if [ -z "$TAG" ]; then
  TAG=$(git rev-parse --short HEAD)
fi

if [ -z "$TAG" ]; then
  echo "Error: Could not determine Git commit SHA."
  exit 1
fi

echo "🚀 Deploying version: $TAG"

# 切换到脚本所在目录的上一级 (项目根目录)，确保 docker compose 上下文正确
cd "$(dirname "$0")/.."

# 使用指定的 TAG 构建并启动服务
# -f deploy/docker-compose.yml: 指定配置文件路径
# --build: 强制重新构建 (确保包含最新代码)
# -d: 后台运行
TAG=$TAG docker compose -f deploy/docker-compose.yml up --build -d

if [ $? -eq 0 ]; then
  echo "✅ Deployment successful! Version: $TAG"
  echo "🌐 Web: http://localhost:3000"
  echo "🔌 API: http://localhost:8787/healthz"
else
  echo "❌ Deployment failed."
  exit 1
fi
