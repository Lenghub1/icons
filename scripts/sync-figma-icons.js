const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { transform } = require("@svgr/core");

// Load environment variables
require("dotenv").config();

// Configuration
const CONFIG = {
  figmaFileId: process.env.FIGMA_FILE_ID || "YOUR_FIGMA_FILE_ID",
  figmaToken: process.env.FIGMA_TOKEN || "YOUR_FIGMA_TOKEN",
  iconNodeId: process.env.FIGMA_ICON_NODE_ID || "YOUR_ICON_FRAME_NODE_ID",
  outputDir: "./src/icons",
  indexFile: "./src/index.js",
  typesFile: "./src/index.d.ts",
  packageName: "@yourcompany/icon-library",
};

// Validate configuration
if (!CONFIG.figmaToken || CONFIG.figmaToken === "YOUR_FIGMA_TOKEN") {
  console.error("❌ FIGMA_TOKEN is missing or invalid");
  console.error("   Get your token from: https://www.figma.com/settings");
  process.exit(1);
}

if (!CONFIG.figmaFileId || CONFIG.figmaFileId === "YOUR_FIGMA_FILE_ID") {
  console.error("❌ FIGMA_FILE_ID is missing");
  process.exit(1);
}

if (!CONFIG.iconNodeId || CONFIG.iconNodeId === "YOUR_ICON_FRAME_NODE_ID") {
  console.error("❌ FIGMA_ICON_NODE_ID is missing");
  process.exit(1);
}

console.log("🔧 Configuration:");
console.log("   File ID:", CONFIG.figmaFileId);
console.log("   Node ID:", CONFIG.iconNodeId);
console.log("   Token:", CONFIG.figmaToken ? "✅ Found" : "❌ Missing");

class FigmaIconSync {
  constructor() {
    this.figmaApi = axios.create({
      baseURL: "https://api.figma.com/v1",
      headers: {
        "X-Figma-Token": CONFIG.figmaToken,
      },
    });
  }

  async getIconNodes() {
    try {
      console.log("📡 Fetching icons from Figma...");
      const response = await this.figmaApi.get(
        `/files/${CONFIG.figmaFileId}/nodes?ids=${CONFIG.iconNodeId}`
      );
      const iconFrame = response.data.nodes[CONFIG.iconNodeId];

      if (!iconFrame) {
        throw new Error("Icon frame not found. Check your FIGMA_ICON_NODE_ID");
      }

      const icons = this.extractIconsFromFrame(iconFrame.document);
      console.log(`✅ Found ${icons.length} icons in Figma`);

      return icons;
    } catch (error) {
      if (error.response) {
        console.error(
          "❌ Figma API Error:",
          error.response.status,
          error.response.statusText
        );
        if (error.response.status === 403) {
          console.error("   → Check your FIGMA_TOKEN permissions");
          console.error("   → Make sure you have access to this file");
        }
        if (error.response.status === 404) {
          console.error("   → Check your FIGMA_FILE_ID");
        }
      } else {
        console.error("❌ Network Error:", error.message);
      }
      throw error;
    }
  }

  extractIconsFromFrame(frame) {
    const icons = [];

    const traverse = (node) => {
      if (node.type === "COMPONENT" && node.name) {
        const nameInfo = this.sanitizeIconName(node.name);
        icons.push({
          id: node.id,
          originalName: node.name,
          fileName: nameInfo.fileName,
          componentName: nameInfo.componentName,
        });
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(frame);
    return icons;
  }

  sanitizeIconName(name) {
    // Convert to PascalCase for both filename and component name
    const componentName =
      name
        .replace(/[^a-zA-Z0-9]/g, " ") // Replace non-alphanumeric with spaces
        .replace(/^[0-9]/, "_$&") // Prefix with underscore if starts with number
        .split(" ") // Split on spaces
        .filter((word) => word.length > 0) // Remove empty words
        .map(
          (word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ) // Capitalize first letter
        .join("") || // Join back together
      "UnnamedIcon";

    return {
      fileName: componentName, // e.g., "Home", "SearchIcon", "UserProfile"
      componentName: componentName, // e.g., "Home", "SearchIcon", "UserProfile"
    };
  }

  async downloadIconSvgs(icons) {
    const iconIds = icons.map((icon) => icon.id).join(",");

    try {
      console.log("⬇️ Downloading SVGs...");
      const response = await this.figmaApi.get(
        `/images/${CONFIG.figmaFileId}?ids=${iconIds}&format=svg`
      );
      const imageUrls = response.data.images;

      const svgPromises = icons.map(async (icon) => {
        const svgUrl = imageUrls[icon.id];
        if (!svgUrl) {
          console.warn(`⚠️ No SVG URL for icon: ${icon.originalName}`);
          return null;
        }

        const svgResponse = await axios.get(svgUrl);
        return {
          ...icon,
          svg: svgResponse.data,
        };
      });

      const results = await Promise.all(svgPromises);
      const validResults = results.filter(Boolean);
      console.log(`✅ Downloaded ${validResults.length} SVGs`);

      return validResults;
    } catch (error) {
      console.error("❌ Error downloading SVGs:", error.message);
      throw error;
    }
  }

  async convertSvgToReactComponent(svg, icon) {
    const svgrConfig = {
      icon: true,
      typescript: false,
      dimensions: false,
      svgProps: {
        fill: "currentColor",
        width: "{size}",
        height: "{size}",
        "...props": null,
      },
      template: ({ componentName, props, jsx }, { tpl }) => {
        return tpl`
import React from 'react';

const ${componentName} = ({ size = 24, color = 'currentColor', ...props }) => (
  ${jsx}
);

${componentName}.displayName = '${icon.componentName}';

export default ${componentName};
        `;
      },
    };

    try {
      const componentCode = await transform(svg, svgrConfig, {
        componentName: icon.componentName,
      });
      return componentCode;
    } catch (error) {
      console.error(
        `❌ Error converting SVG to React component for ${icon.originalName}:`,
        error
      );
      throw error;
    }
  }

  async saveIconComponents(iconData) {
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const iconInfo = [];

    console.log("⚛️ Generating React components...");

    for (const icon of iconData) {
      const componentCode = await this.convertSvgToReactComponent(
        icon.svg,
        icon
      );
      const filePath = path.join(CONFIG.outputDir, `${icon.fileName}.js`);

      fs.writeFileSync(filePath, componentCode);
      iconInfo.push({
        fileName: icon.fileName,
        componentName: icon.componentName,
        originalName: icon.originalName,
      });
      console.log(`  ✓ ${icon.fileName}.js`);
    }

    return iconInfo;
  }

  generateMainIndex(iconInfo) {
    const exports = iconInfo
      .map(
        (icon) =>
          `export { default as ${icon.componentName} } from './icons/${icon.fileName}';`
      )
      .join("\n");

    const indexContent = `// Auto-generated from Figma - Do not edit
${exports}

// All icons object
export const AllIcons = {
${iconInfo.map((icon) => `  ${icon.componentName}`).join(",\n")}
};

// Icon names array
export const IconNames = [${iconInfo
      .map((icon) => `'${icon.componentName}'`)
      .join(", ")}];
`;

    fs.writeFileSync(CONFIG.indexFile, indexContent);
    console.log(`✅ Generated index.js with ${iconInfo.length} exports`);
  }

  generateTypeDefinitions(iconInfo) {
    const interfaceProps = `
interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

type IconComponent = React.FC<IconProps>;
`;

    const exports = iconInfo
      .map(
        (icon) => `export declare const ${icon.componentName}: IconComponent;`
      )
      .join("\n");

    const typesContent = `import React from 'react';
${interfaceProps}
${exports}

export declare const AllIcons: {
${iconInfo.map((icon) => `  ${icon.componentName}: IconComponent;`).join("\n")}
};

export declare const IconNames: string[];
`;

    fs.writeFileSync(CONFIG.typesFile, typesContent);
    console.log(`✅ Generated TypeScript definitions`);
  }

  generateReadme(iconInfo) {
    const readmeContent = `# ${CONFIG.packageName}

React icon library automatically synced from Figma.

## Installation

\`\`\`bash
npm install ${CONFIG.packageName}
\`\`\`

## Usage

### Individual Icons
\`\`\`jsx
import { ${iconInfo
      .slice(0, 3)
      .map((icon) => icon.componentName)
      .join(", ")} } from '${CONFIG.packageName}';

function App() {
  return (
    <div>
      <${iconInfo[0]?.componentName || "Home"} size={24} />
      <${iconInfo[1]?.componentName || "Search"} size={32} color="blue" />
      <${iconInfo[2]?.componentName || "User"} className="my-icon" />
    </div>
  );
}
\`\`\`

### All Icons
\`\`\`jsx
import { AllIcons } from '${CONFIG.packageName}';

function IconGrid() {
  return (
    <div>
      {Object.entries(AllIcons).map(([name, Icon]) => (
        <div key={name}>
          <Icon size={24} />
          <span>{name}</span>
        </div>
      ))}
    </div>
  );
}
\`\`\`

## Props

All icons accept these props:
- \`size\`: number | string (default: 24)
- \`color\`: string (default: 'currentColor')
- \`className\`: string
- \`style\`: React.CSSProperties
- Any other SVG props

## Available Icons (${iconInfo.length})

${iconInfo
  .map(
    (icon) =>
      `- **${icon.componentName}** (from "${icon.originalName}") → \`${icon.fileName}.js\``
  )
  .join("\n")}

---

*Auto-updated from Figma*
`;

    fs.writeFileSync("./README.md", readmeContent);
    console.log(`✅ Generated README.md`);
  }

  async sync() {
    try {
      console.log("🚀 Starting Figma icon sync...\n");

      const icons = await this.getIconNodes();
      const iconData = await this.downloadIconSvgs(icons);
      const iconInfo = await this.saveIconComponents(iconData);

      this.generateMainIndex(iconInfo);
      this.generateTypeDefinitions(iconInfo);
      this.generateReadme(iconInfo);

      console.log("\n✅ Figma icon sync completed successfully!");
      console.log(`📦 Ready to publish ${iconInfo.length} icons to npm`);
    } catch (error) {
      console.error("\n❌ Sync failed:", error.message);
      process.exit(1);
    }
  }
}

// Run the sync
const figmaSync = new FigmaIconSync();
figmaSync.sync();
