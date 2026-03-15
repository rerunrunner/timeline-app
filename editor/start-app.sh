#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Optional: point backend at a data repo (e.g. ../../../runner-data when run from editor/). If unset, uses ./data inside backend-java.
export TIMELINE_DATA_DIR="${TIMELINE_DATA_DIR:-}"

echo -e "${GREEN}Starting Timeline Data Editor...${NC}"
if [ -n "$TIMELINE_DATA_DIR" ]; then
  echo -e "${YELLOW}Data dir: $TIMELINE_DATA_DIR${NC}"
fi

# Function to cleanup background processes on exit
cleanup() {
    echo -e "\n${YELLOW}Shutting down services...${NC}"
    kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
    exit 0
}

# Set up signal handlers
trap cleanup SIGINT SIGTERM

# Start backend
echo -e "${YELLOW}Starting Java backend on port 5001...${NC}"
cd backend-java
mvn spring-boot:run &
BACKEND_PID=$!
cd ..

# Wait a moment for backend to start
sleep 3

# Start frontend
echo -e "${YELLOW}Starting React frontend on port 5174...${NC}"
cd frontend
npm install
npm run dev &
FRONTEND_PID=$!
cd ..

echo -e "${GREEN}Both services started!${NC}"
echo -e "${GREEN}Backend: http://localhost:5001${NC}"
echo -e "${GREEN}Frontend: http://localhost:5174${NC}"
echo -e "${YELLOW}Press Ctrl+C to stop both services${NC}"

# Wait for user to stop
wait
