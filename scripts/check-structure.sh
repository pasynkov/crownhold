#!/bin/bash

# Crown Hold Project Structure Checker
# Verifies that all required directories and files are in place

set -e

echo "🔍 Checking Crown Hold Project Structure..."
echo ""

errors=0

# Function to check if file/directory exists
check_exists() {
    local path=$1
    local type=$2
    local required=$3

    if [ -e "$path" ]; then
        echo "✅ $path"
    else
        if [ "$required" = "true" ]; then
            echo "❌ Missing (required): $path"
            ((errors++))
        else
            echo "⚠️  Missing (optional): $path"
        fi
    fi
}

# Check root files
echo "📁 Root Files:"
check_exists "README.md" "file" "true"
check_exists "CLAUDE.md" "file" "true"
check_exists "PROJECT_STRUCTURE.md" "file" "true"
check_exists "LICENSE" "file" "true"
check_exists ".gitignore" "file" "true"
check_exists "package.json" "file" "true"
echo ""

# Check documentation
echo "📚 Documentation:"
check_exists "docs" "dir" "true"
check_exists "docs/architecture.md" "file" "true"
check_exists "docs/mcp-servers.md" "file" "true"
check_exists "docs/claude-setup.md" "file" "true"
check_exists "docs/environment-setup.md" "file" "true"
check_exists "docs/workflows.md" "file" "true"
echo ""

# Check scripts
echo "🛠️  Scripts:"
check_exists "scripts" "dir" "true"
check_exists "scripts/setup-env.js" "file" "true"
check_exists "scripts/check-structure.sh" "file" "false"
echo ""

# Check applications directory
echo "🚀 Applications:"
check_exists "applications" "dir" "true"
check_exists "applications/mcp-polygon" "dir" "true"
check_exists "applications/mcp-kraken" "dir" "true"
check_exists "applications/mcp-wise" "dir" "true"
echo ""

# Check each application
for app in mcp-polygon mcp-kraken mcp-wise; do
    echo "📦 $app:"
    check_exists "applications/$app/README.md" "file" "true"
    check_exists "applications/$app/package.json" "file" "false"
    check_exists "applications/$app/.env.example" "file" "false"
    check_exists "applications/$app/src" "dir" "false"

    # Warn if .env exists (shouldn't be in git)
    if [ -e "applications/$app/.env" ]; then
        echo "⚠️  .env file exists (make sure it's in .gitignore!)"
    fi
    echo ""
done

# Check .gitignore content
echo "🔒 Security Checks:"
if grep -q "^\.env$" .gitignore; then
    echo "✅ .env files are in .gitignore"
else
    echo "❌ .env files NOT in .gitignore (SECURITY RISK!)"
    ((errors++))
fi

if grep -q "^node_modules" .gitignore; then
    echo "✅ node_modules is in .gitignore"
else
    echo "❌ node_modules NOT in .gitignore"
    ((errors++))
fi
echo ""

# Summary
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
if [ $errors -eq 0 ]; then
    echo "✨ All required files and directories are present!"
    echo "📝 Next steps:"
    echo "   1. Run: npm install"
    echo "   2. Implement MCP servers in applications/"
    echo "   3. Create .env.example files"
    echo "   4. Run: npm run setup:env"
    echo "   5. Build and configure Claude Desktop"
    exit 0
else
    echo "❌ Found $errors error(s)"
    echo "Please create missing required files/directories"
    exit 1
fi
