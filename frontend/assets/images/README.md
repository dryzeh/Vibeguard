# Assets Directory

This directory contains static assets used in the VibeGuard application.

## Images

### Logo
The application logo should be placed at `images/vibeguard-logo.png`. For development purposes, you can use any placeholder image with the following specifications:

- File name: `vibeguard-logo.png`
- Recommended size: 200x200 pixels
- Format: PNG with transparency
- Color: The logo will be tinted with the primary color defined in the theme

### Floor Plans
Floor plan images should be placed in the `floorplans` directory. Each floor plan should be a PNG or SVG file with the following specifications:

- Format: PNG or SVG
- Recommended size: 1024x1024 pixels or larger
- Background: Transparent or white
- File naming: Use descriptive names like `floor-1.png`, `floor-2.png`, etc.

## Icons
Custom icons should be placed in the `icons` directory. All icons should be in SVG format for best quality and scalability.

## Usage
When using these assets in the application, always import them using the require syntax:

```typescript
// For images
const logo = require('../assets/images/vibeguard-logo.png');

// For icons
const icon = require('../assets/icons/icon-name.svg');
```

Note: For development purposes, you can use a placeholder logo image. In production, replace it with the actual VibeGuard logo. 