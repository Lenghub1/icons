const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { transform } = require("@svgr/core");

// Configuration - UPDATE THESE VALUES
const CONFIG = {
  figmaFileId: process.env.FIGMA_FILE_ID || "YOUR_FIGMA_FILE_ID",
  figmaToken: process.env.FIGMA_TOKEN || "YOUR_FIGMA_TOKEN",
  iconNodeId: process.env.FIGMA_ICON_NODE_ID || "YOUR_ICON_FRAME_NODE_ID",
  outputDir: "./src/icons",
  indexFile: "./src/index.js",
  typesFile: "./dist/index.d.ts",
  packageName: "@yourcompany/icon-library",
};

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
      console.error("❌ Error fetching icon nodes:", error.message);
      throw error;
    }
  }

  extractIconsFromFrame(frame) {
    const icons = [];

    const traverse = (node) => {
      if (node.type === "COMPONENT" && node.name) {
        icons.push({
          id: node.id,
          name: this.sanitizeIconName(node.name),
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
    return (
      name
        .replace(/[^a-zA-Z0-9]/g, "")
        .replace(/^[0-9]/, "_$&")
        .replace(/([a-z])([A-Z])/g, "$1$2") || "UnnamedIcon"
    );
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
          console.warn(`⚠️ No SVG URL for icon: ${icon.name}`);
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

  async convertSvgToReactComponent(svg, iconName) {
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

${componentName}.displayName = '${iconName}';

export default ${componentName};
        `;
      },
    };

    try {
      const componentCode = await transform(svg, svgrConfig, {
        componentName: iconName,
      });
      return componentCode;
    } catch (error) {
      console.error(
        `❌ Error converting SVG to React component for ${iconName}:`,
        error
      );
      throw error;
    }
  }

  async saveIconComponents(iconData) {
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const iconNames = [];

    console.log("⚛️ Generating React components...");

    for (const icon of iconData) {
      const componentCode = await this.convertSvgToReactComponent(
        icon.svg,
        icon.name
      );
      const filePath = path.join(CONFIG.outputDir, `${icon.name}.js`);

      fs.writeFileSync(filePath, componentCode);
      iconNames.push(icon.name);
      console.log(`  ✓ ${icon.name}.js`);
    }

    return iconNames;
  }

  generateMainIndex(iconNames) {
    const exports = iconNames
      .map((name) => `export { default as ${name} } from './icons/${name}';`)
      .join("\n");

    const indexContent = `// Auto-generated from Figma - Do not edit
${exports}

// All icons object
export const AllIcons = {
${iconNames.map((name) => `  ${name}`).join(",\n")}
};

// Icon names array
export const IconNames = [${iconNames.map((name) => `'${name}'`).join(", ")}];
`;

    fs.writeFileSync(CONFIG.indexFile, indexContent);
    console.log(`✅ Generated index.js with ${iconNames.length} exports`);
  }

  generateTypeDefinitions(iconNames) {
    const interfaceProps = `
interface IconProps {
  size?: number | string;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
}

type IconComponent = React.FC<IconProps>;
`;

    const exports = iconNames
      .map((name) => `export declare const ${name}: IconComponent;`)
      .join("\n");

    const typesContent = `import React from 'react';
${interfaceProps}
${exports}

export declare const AllIcons: {
${iconNames.map((name) => `  ${name}: IconComponent;`).join("\n")}
};

export declare const IconNames: string[];
`;

    // Create dist directory if it doesn't exist
    const distDir = path.dirname(CONFIG.typesFile);
    if (!fs.existsSync(distDir)) {
      fs.mkdirSync(distDir, { recursive: true });
    }

    fs.writeFileSync(CONFIG.typesFile, typesContent);
    console.log(`✅ Generated TypeScript definitions`);
  }

  generateReadme(iconNames) {
    const readmeContent = `# ${CONFIG.packageName}

React icon library automatically synced from Figma.

## Installation

\`\`\`bash
npm install ${CONFIG.packageName}
\`\`\`

## Usage

### Individual Icons
\`\`\`jsx
import { ${iconNames.slice(0, 3).join(", ")} } from '${CONFIG.packageName}';

function App() {
  return (
    <div>
      <${iconNames[0]} size={24} />
      <${iconNames[1] || "Home"} size={32} color="blue" />
      <${iconNames[2] || "Search"} className="my-icon" />
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

## Available Icons (${iconNames.length})

${iconNames.map((name) => `- ${name}`).join("\n")}

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
      const iconNames = await this.saveIconComponents(iconData);

      this.generateMainIndex(iconNames);
      this.generateTypeDefinitions(iconNames);
      this.generateReadme(iconNames);

      console.log("\n✅ Figma icon sync completed successfully!");
      console.log(`📦 Ready to publish ${iconNames.length} icons to npm`);
    } catch (error) {
      console.error("\n❌ Sync failed:", error.message);
      process.exit(1);
    }
  }
}

// Run the sync
const figmaSync = new FigmaIconSync();
figmaSync.sync();
