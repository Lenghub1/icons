# leng-icon-library

React icon library automatically synced from Figma.

## Installation

```bash
npm install leng-icon-library
```

## Usage

### Individual Icons
```jsx
import { IconDownload, IconDocumentUpload, IconWarning } from 'leng-icon-library';

function App() {
  return (
    <div>
      <IconDownload size={24} />
      <IconDocumentUpload size={32} color="blue" />
      <IconWarning className="my-icon" />
    </div>
  );
}
```

### All Icons
```jsx
import { AllIcons } from 'leng-icon-library';

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
```

## Props

All icons accept these props:
- `size`: number | string (default: 24)
- `color`: string (default: 'currentColor')
- `className`: string
- `style`: React.CSSProperties
- Any other SVG props

## Available Icons (30)

- **IconDownload** (from "Icon=download") → `IconDownload.js`
- **IconDocumentUpload** (from "Icon=document-upload") → `IconDocumentUpload.js`
- **IconWarning** (from "Icon=warning") → `IconWarning.js`
- **IconGlobe** (from "Icon=globe") → `IconGlobe.js`
- **IconCheck** (from "Icon=check") → `IconCheck.js`
- **IconDiamond** (from "Icon=diamond") → `IconDiamond.js`
- **IconClose** (from "Icon=close") → `IconClose.js`
- **IconMoney** (from "Icon=money") → `IconMoney.js`
- **IconUser** (from "Icon=user") → `IconUser.js`
- **IconTarget** (from "Icon=target") → `IconTarget.js`
- **IconEarth** (from "Icon=earth") → `IconEarth.js`
- **IconPreference** (from "Icon=Preference") → `IconPreference.js`
- **IconCloud** (from "Icon=cloud") → `IconCloud.js`
- **IconEdit** (from "Icon=edit") → `IconEdit.js`
- **IconCopy** (from "Icon=copy") → `IconCopy.js`
- **IconCamera** (from "Icon=camera") → `IconCamera.js`
- **IconTrash** (from "Icon=trash") → `IconTrash.js`
- **IconCalendar** (from "Icon=calendar") → `IconCalendar.js`
- **IconDropdown** (from "Icon=dropdown") → `IconDropdown.js`
- **IconMail** (from "Icon=mail") → `IconMail.js`
- **IconEye** (from "Icon=eye") → `IconEye.js`
- **IconBell** (from "Icon=Bell") → `IconBell.js`
- **IconMenu** (from "Icon=menu") → `IconMenu.js`
- **IconChevronDown** (from "Icon=chevron-down") → `IconChevronDown.js`
- **IconChevronLeft** (from "Icon=chevron-left") → `IconChevronLeft.js`
- **IconChevronRight** (from "Icon=chevron-right") → `IconChevronRight.js`
- **IconChevronUp** (from "Icon=Chevron-up") → `IconChevronUp.js`
- **IconChevron** (from "Icon=Chevron") → `IconChevron.js`
- **Unlock** (from "unlock") → `Unlock.js`
- **BagOutline** (from "bag-outline") → `BagOutline.js`

---

*Auto-updated from Figma*
