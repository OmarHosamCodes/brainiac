#!/bin/bash

# Brainiac Setup Script
# ====================
# Automates the initial setup for new developers
# Usage: bash scripts/setup.sh

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
log_info() {
  echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
  echo -e "${GREEN}✅ $1${NC}"
}

log_error() {
  echo -e "${RED}❌ $1${NC}"
}

log_warning() {
  echo -e "${YELLOW}⚠️  $1${NC}"
}

print_header() {
  echo ""
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
  echo ""
}

# Check if Bun is installed
check_bun() {
  print_header "Checking Prerequisites"
  
  if ! command -v bun &> /dev/null; then
    log_error "Bun is not installed"
    echo "Install Bun from: https://bun.sh"
    exit 1
  fi
  
  BUN_VERSION=$(bun --version)
  log_success "Bun $BUN_VERSION is installed"
  
  if ! command -v docker &> /dev/null; then
    log_warning "Docker is not installed. Database will not start automatically."
    log_info "Install Docker from: https://docker.com"
  else
    log_success "Docker is installed"
  fi
}

# Setup environment files
setup_env_files() {
  print_header "Setting Up Environment Variables"
  
  # Root .env
  if [ ! -f .env ]; then
    if [ -f .env.example ]; then
      cp .env.example .env
      log_success "Created .env from .env.example"
    fi
  else
    log_info ".env already exists"
  fi
  
  # Server .env
  if [ ! -f apps/server/.env ]; then
    if [ -f apps/server/.env.example ]; then
      cp apps/server/.env.example apps/server/.env
      log_success "Created apps/server/.env from apps/server/.env.example"
    fi
  else
    log_info "apps/server/.env already exists"
  fi
  
  # Web .env
  if [ ! -f apps/web/.env ]; then
    if [ -f apps/web/.env.example ]; then
      cp apps/web/.env.example apps/web/.env
      log_success "Created apps/web/.env from apps/web/.env.example"
    fi
  else
    log_info "apps/web/.env already exists"
  fi
  
  log_info "Review the .env files and update secrets as needed"
  echo "  • BETTER_AUTH_SECRET: Generate with: openssl rand -hex 16"
  echo "  • OPENROUTER_API_KEY: Get from https://openrouter.ai/keys"
  echo "  • Polar tokens: Optional (only needed for billing)"
}

# Install dependencies
install_deps() {
  print_header "Installing Dependencies"
  
  if [ -d node_modules ] && [ -f bun.lock ]; then
    log_info "Dependencies already installed"
  else
    log_info "Running: bun install"
    bun install
    log_success "Dependencies installed"
  fi
}

# Setup database
setup_database() {
  print_header "Setting Up Database"
  
  if ! command -v docker &> /dev/null; then
    log_warning "Skipping database setup (Docker not installed)"
    log_info "When ready, run:"
    echo "  bun run db:start   # Start PostgreSQL"
    echo "  bun run db:push    # Apply schema"
    echo "  bun run db:seed    # Load demo data (optional)"
    return
  fi
  
  log_info "Starting PostgreSQL..."
  bun run db:start
  log_success "PostgreSQL started (or was already running)"
  
  # Wait a bit for database to be ready
  sleep 2
  
  log_info "Applying database schema..."
  bun run db:push
  log_success "Database schema applied"
}

# Offer to seed data
offer_seed() {
  print_header "Database Demo Data"
  
  read -p "Would you like to load demo data? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    log_info "Seeding demo data..."
    bun run db:seed
    log_success "Demo data loaded"
    echo ""
    echo "Demo accounts:"
    echo "  • founder@brainiac.test / brainiac1234"
    echo "  • ops@brainiac.test / brainiac1234"
    echo "  • analyst@brainiac.test / brainiac1234"
  else
    log_info "Skipped seeding. Run 'bun run db:seed' later if needed."
  fi
}

# Type checking
check_types() {
  print_header "Checking TypeScript Types"
  
  log_info "Running: bun run check-types"
  if bun run check-types; then
    log_success "All types are valid"
  else
    log_warning "Some type errors found. You can still run the dev server."
    log_info "Fix errors with: bun run check"
  fi
}

# Final message
print_completion() {
  print_header "✨ Setup Complete!"
  
  echo "You're ready to start developing! 🚀"
  echo ""
  echo "Start the dev server with:"
  echo "  ${GREEN}bun run dev${NC}"
  echo ""
  echo "Then open in your browser:"
  echo "  • Frontend: http://localhost:7001"
  echo "  • Backend:  http://localhost:7000"
  echo ""
  echo "Next steps:"
  echo "  • Read CONTRIBUTING.md for code standards"
  echo "  • Read DEVELOPMENT.md for common workflows"
  echo "  • Check README.md for project overview"
  echo ""
}

# Main execution
main() {
  echo ""
  echo -e "${BLUE}╔════════════════════════════════════════════════════════╗${NC}"
  echo -e "${BLUE}║        Welcome to Brainiac Development Setup           ║${NC}"
  echo -e "${BLUE}╚════════════════════════════════════════════════════════╝${NC}"
  
  check_bun
  setup_env_files
  install_deps
  setup_database
  offer_seed
  check_types
  print_completion
}

main "$@"
