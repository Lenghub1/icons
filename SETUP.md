# Setup Guide

## Step 1: Create Project Structure

```
your-icon-library/
├── .github/
│   └── workflows/
│       └── sync-icons.yml
├── scripts/
│   └── sync-figma-icons.js
├── src/
│   └── (will be auto-generated)
├── package.json
├── rollup.config.js
├── .env.example
├── .gitignore
└── SETUP.md
```

## Step 2: Install Dependencies

```bash
npm install
```

## Step 3: Get Figma Credentials

### A. Get Figma Token

1. Go to [Figma Account Settings](https://www.figma.com/settings)
2. Scroll to "Personal Access Tokens"
3. Click "Create new token"
4. Copy the token

### B. Get File ID

1. Open your Figma file
2. Copy the URL: `https://www.figma.com/file/ABC123/My-Icons`
3. File ID is: `ABC123`

### C. Get Icon Frame Node ID

1. Create a frame in Figma for your icons
2. Add your icon components inside this frame
3. Right-click the frame → "Copy link"
4. URL will be: `https://www.figma.com/file/ABC123/My-Icons?node-id=456%3A789`
5. Node ID is: `456:789` (replace `%3A` with `:`)

## Step 4: Set Environment Variables

### Local Development:

Create `.env` file:

```bash
FIGMA_TOKEN=your_actual_token_here
FIGMA_FILE_ID=your_file_id_here
FIGMA_ICON_NODE_ID=your_node_id_here
```

### GitHub Repository:

1. Go to your GitHub repo
2. Settings → Secrets and variables → Actions
3. Add these secrets:
   - `FIGMA_TOKEN`
   - `FIGMA_FILE_ID`
   - `FIGMA_ICON_NODE_ID`
   - `NPM_TOKEN` (from npmjs.com)

## Step 5: Update Package Name

In `package.json`, change:

```json
"name": "@yourcompany/icon-library"
```

To your actual package name:

```json
"name": "@mycompany/my-icons"
```

## Step 6: Test Locally

```bash
# Test the sync
npm run sync

# Test the build
npm run build

# Check generated files
ls src/icons/
```

## Step 7: Publish

```bash
# Login to npm
npm login

# Publish manually (or let GitHub Actions do it)
npm publish
```

## Step 8: Use Your Library

### Install:

```bash
npm install @mycompany/my-icons
```

### Use:

```jsx
import { Home, Search, User } from "@mycompany/my-icons";

<Home size={24} color="blue" />;
```

## Troubleshooting

### "Icon frame not found"

- Check your `FIGMA_ICON_NODE_ID`
- Make sure the frame exists in Figma
- Verify the node ID format (should be like `123:456`)

### "No icons found"

- Make sure icons are **components** in Figma (not just shapes)
- Icons must be inside the specified frame
- Check icon names don't have special characters

### "Build failed"

- Run `npm run sync` first
- Check that `src/icons/` folder has generated files
- Verify all dependencies are installed

## Daily Automation

Once set up, GitHub Actions will:

1. Check Figma daily at 2 AM
2. Download new/changed icons
3. Generate React components
4. Build the library
5. Publish to npm automatically

You just design in Figma, everything else is automated! 🎨 → 🤖 → 📦
