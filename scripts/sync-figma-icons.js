const fs = require("fs");
const path = require("path");
const axios = require("axios");
const { transform } = require("@svgr/core");
require("dotenv").config();

const CONFIG = {
  figmaFileId: process.env.FIGMA_FILE_ID || "YOUR_FIGMA_FILE_ID",
  figmaToken: process.env.FIGMA_TOKEN || "YOUR_FIGMA_TOKEN",
  iconNodeId: process.env.FIGMA_ICON_NODE_ID || "YOUR_ICON_FRAME_NODE_ID",
  outputDir: "./src/icons",
  indexFile: "./src/index.js",
  typesFile: "./dist/index.d.ts",
  packageName: "@yourcompany/icon-library",
};

if (!CONFIG.figmaToken || CONFIG.figmaToken === "YOUR_FIGMA_TOKEN") {
  console.error("\u274C FIGMA_TOKEN is missing or invalid");
  process.exit(1);
}
if (!CONFIG.figmaFileId || CONFIG.figmaFileId === "YOUR_FIGMA_FILE_ID") {
  console.error("\u274C FIGMA_FILE_ID is missing");
  process.exit(1);
}
if (!CONFIG.iconNodeId || CONFIG.iconNodeId === "YOUR_ICON_FRAME_NODE_ID") {
  console.error("\u274C FIGMA_ICON_NODE_ID is missing");
  process.exit(1);
}

class FigmaIconSync {
  constructor() {
    this.figmaApi = axios.create({
      baseURL: "https://api.figma.com/v1",
      headers: {
        "X-Figma-Token": CONFIG.figmaToken,
      },
    });
  }

  sanitizeComponentName(name) {
    return (
      name
        .replace(/[^a-zA-Z0-9]/g, " ")
        .replace(/^[^a-zA-Z_]/, "_")
        .replace(/(?:^|\s+)(\w)/g, (_, c) => c.toUpperCase())
        .replace(/\s+/g, "") || "UnnamedIcon"
    );
  }

  async getIconNodes() {
    console.log("\ud83d\udcf1 Fetching icons from Figma...");
    const response = await this.figmaApi.get(
      `/files/${CONFIG.figmaFileId}/nodes?ids=${CONFIG.iconNodeId}`
    );
    const iconFrame = response.data.nodes[CONFIG.iconNodeId];

    if (!iconFrame) throw new Error("Icon frame not found");

    const icons = [];
    const traverse = (node) => {
      if (node.type === "COMPONENT" && node.name) {
        icons.push({
          id: node.id,
          originalName: node.name.replace(/=/g, "-"),
          componentName: this.sanitizeComponentName(node.name),
        });
      }
      if (node.children) node.children.forEach(traverse);
    };
    traverse(iconFrame.document);
    return icons;
  }

  async downloadIconSvgs(icons) {
    const iconIds = icons.map((icon) => icon.id).join(",");
    const response = await this.figmaApi.get(
      `/images/${CONFIG.figmaFileId}?ids=${iconIds}&format=svg`
    );
    const imageUrls = response.data.images;

    const svgPromises = icons.map(async (icon) => {
      const svgUrl = imageUrls[icon.id];
      if (!svgUrl) return null;
      const svgResponse = await axios.get(svgUrl);
      return { ...icon, svg: svgResponse.data };
    });

    const results = await Promise.all(svgPromises);
    return results.filter(Boolean);
  }

  async convertSvgToReactComponent(svg, componentName) {
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
      template: ({ componentName, props, jsx }, { tpl }) => tpl`
import React from 'react';

const ${componentName} = ({ size = 24, color = 'currentColor', ...props }) => (
  ${jsx}
);

${componentName}.displayName = '${componentName}';

export default ${componentName};
      `,
    };

    return await transform(svg, svgrConfig, { componentName });
  }

  async saveIconComponents(iconData) {
    if (!fs.existsSync(CONFIG.outputDir)) {
      fs.mkdirSync(CONFIG.outputDir, { recursive: true });
    }

    const iconNames = [];
    for (const icon of iconData) {
      const fileName = `${icon.originalName}.js`;
      const filePath = path.join(CONFIG.outputDir, fileName);
      const code = await this.convertSvgToReactComponent(
        icon.svg,
        icon.componentName
      );
      fs.writeFileSync(filePath, code);
      iconNames.push({
        originalName: icon.originalName,
        componentName: icon.componentName,
      });
    }
    return iconNames;
  }

  generateMainIndex(iconNames) {
    const exports = iconNames
      .map(
        ({ componentName, originalName }) =>
          `export { default as ${componentName} } from './icons/${originalName}';`
      )
      .join("\n");

    const indexContent = `// Auto-generated from Figma
${exports}

export const AllIcons = {
${iconNames.map(({ componentName }) => `  ${componentName},`).join("\n")}
};

export const IconNames = [${iconNames
      .map(({ componentName }) => `'${componentName}'`)
      .join(", ")}];
`;
    fs.writeFileSync(CONFIG.indexFile, indexContent);
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
      .map(
        ({ componentName }) =>
          `export declare const ${componentName}: IconComponent;`
      )
      .join("\n");

    const typesContent = `import React from 'react';
${interfaceProps}
${exports}

export declare const AllIcons: {
${iconNames
  .map(({ componentName }) => `  ${componentName}: IconComponent;`)
  .join("\n")}
};

export declare const IconNames: string[];
`;

    const distDir = path.dirname(CONFIG.typesFile);
    if (!fs.existsSync(distDir)) fs.mkdirSync(distDir, { recursive: true });
    fs.writeFileSync(CONFIG.typesFile, typesContent);
  }

  generateReadme(iconNames) {
    const content = `# ${CONFIG.packageName}

Auto-synced from Figma.

## Usage

\`\`\`jsx
import { ${iconNames
      .slice(0, 3)
      .map((i) => i.componentName)
      .join(", ")} } from '${CONFIG.packageName}';
\`\`\`

## Available Icons (${iconNames.length})

${iconNames.map(({ originalName }) => `- ${originalName}`).join("\n")}
`;
    fs.writeFileSync("./README.md", content);
  }

  async sync() {
    try {
      const icons = await this.getIconNodes();
      const iconData = await this.downloadIconSvgs(icons);
      const iconNames = await this.saveIconComponents(iconData);
      this.generateMainIndex(iconNames);
      this.generateTypeDefinitions(iconNames);
      this.generateReadme(iconNames);
      console.log("\n\u2705 Figma icon sync completed!");
    } catch (e) {
      console.error("\u274C Sync failed:", e.message);
      process.exit(1);
    }
  }
}

const figmaSync = new FigmaIconSync();
figmaSync.sync();
