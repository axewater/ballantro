/**
 * Color Extractor
 * Extracts dominant colors from the background image and sets them as CSS variables
 */
class ColorExtractor {
  constructor() {
    this.backgroundImage = '/static/assets/images/mainbackdrop.jpg';
    this.colorCount = 3; // Number of colors to extract
    this.cssVarPrefix = '--c'; // Prefix for CSS variables
  }

  /**
   * Initialize the color extraction
   */
  async init() {
    try {
      const colors = await this.extractColors(this.backgroundImage);
      this.setCssVariables(colors);
      console.log('Color extraction complete:', colors);
    } catch (error) {
      console.error('Color extraction failed:', error);
      // Fallback to default colors
      this.setDefaultColors();
    }
  }

  /**
   * Extract colors from an image using Canvas
   * @param {string} imageSrc - Path to the image
   * @returns {Promise<string[]>} Array of hex color values
   */
  extractColors(imageSrc) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      
      img.onload = () => {
        // Create canvas and draw image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);
        
        // Sample pixels from different areas of the image
        const colors = [];
        const samplePoints = [
          { x: img.width * 0.25, y: img.height * 0.25 }, // Top left
          { x: img.width * 0.75, y: img.height * 0.25 }, // Top right
          { x: img.width * 0.5, y: img.height * 0.5 },   // Center
          { x: img.width * 0.25, y: img.height * 0.75 }, // Bottom left
          { x: img.width * 0.75, y: img.height * 0.75 }  // Bottom right
        ];
        
        for (const point of samplePoints) {
          const pixel = ctx.getImageData(point.x, point.y, 1, 1).data;
          const hex = this.rgbToHex(pixel[0], pixel[1], pixel[2]);
          colors.push(hex);
        }
        
        // Filter out similar colors and select the most distinct ones
        const distinctColors = this.getDistinctColors(colors, this.colorCount);
        resolve(distinctColors);
      };
      
      img.onerror = () => {
        reject(new Error('Failed to load image'));
      };
      
      img.src = imageSrc;
    });
  }
  
  /**
   * Convert RGB values to hex color code
   */
  rgbToHex(r, g, b) {
    return '#' + [r, g, b].map(x => {
      const hex = x.toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }
  
  /**
   * Get the most distinct colors from an array of colors
   */
  getDistinctColors(colors, count) {
    // Simple implementation: just take the first 'count' colors
    // A more sophisticated approach would calculate color distance
    return colors.slice(0, count);
  }
  
  /**
   * Set CSS variables with the extracted colors
   */
  setCssVariables(colors) {
    colors.forEach((color, index) => {
      document.documentElement.style.setProperty(`${this.cssVarPrefix}${index + 1}`, color);
    });
  }
  
  /**
   * Set default colors as fallback
   */
  setDefaultColors() {
    document.documentElement.style.setProperty('--c1', '#482ee6'); // violet  
    document.documentElement.style.setProperty('--c2', '#0ab0b9'); // teal  
    document.documentElement.style.setProperty('--c3', '#d8932b'); // amber
  }
}

// Initialize color extractor when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  const colorExtractor = new ColorExtractor();
  colorExtractor.init();
});
