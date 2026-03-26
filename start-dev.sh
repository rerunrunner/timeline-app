#!/bin/bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
EDITOR_DIR="$ROOT_DIR/editor"
BACKEND_DIR="$EDITOR_DIR/backend-java"
EDITOR_FRONTEND_DIR="$EDITOR_DIR/frontend"
VIEWER_DIR="$ROOT_DIR/viewer"
TIMELINE_DATA_DIR="${TIMELINE_DATA_DIR:-}"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

PIDS=()

cleanup() {
  echo -e "\n${YELLOW}Shutting down services...${NC}"
  for pid in "${PIDS[@]:-}"; do
    kill "$pid" 2>/dev/null || true
  done
}

trap cleanup EXIT SIGINT SIGTERM

ensure_npm_dependencies() {
  local dir="$1"

  if [ ! -d "$dir/node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies in $dir...${NC}"
    (
      cd "$dir"
      npm install
    )
  fi
}

if [ -z "$TIMELINE_DATA_DIR" ]; then
  echo -e "${RED}TIMELINE_DATA_DIR is required.${NC}"
  echo "Example: TIMELINE_DATA_DIR=/absolute/path/to/your-data-repo ./start-dev.sh"
  exit 1
fi

echo -e "${GREEN}Starting timeline development stack...${NC}"
echo -e "${YELLOW}Data dir: $TIMELINE_DATA_DIR${NC}"

ensure_npm_dependencies "$EDITOR_FRONTEND_DIR"
ensure_npm_dependencies "$VIEWER_DIR"

echo -e "${YELLOW}Starting Java backend on port 5001...${NC}"
(
  cd "$BACKEND_DIR"
  TIMELINE_DATA_DIR="$TIMELINE_DATA_DIR" mvn spring-boot:run
) &
PIDS+=($!)

sleep 3

echo -e "${YELLOW}Starting editor frontend on port 5174...${NC}"
(
  cd "$EDITOR_FRONTEND_DIR"
  npm run dev -- --host 127.0.0.1 --port 5174 --strictPort
) &
PIDS+=($!)

echo -e "${YELLOW}Starting viewer on port 5173...${NC}"
(
  cd "$VIEWER_DIR"
  npm run dev -- --host 127.0.0.1 --port 5173 --strictPort
) &
PIDS+=($!)

echo -e "${GREEN}All services started.${NC}"
echo -e "${GREEN}Viewer: http://127.0.0.1:5173${NC}"
echo -e "${GREEN}Editor frontend: http://127.0.0.1:5174${NC}"
echo -e "${GREEN}Editor backend: http://127.0.0.1:5001${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop everything.${NC}"

wait
