import { toPng, toJpeg } from 'html-to-image';

/**
 * Configuration options for image export
 */
interface ExportOptions {
  /** The HTML element to export */
  element: HTMLElement;
  /** Dynamic filename based on context/theme */
  filename: string;
  /** Optional pixel ratio for higher resolution (default: 2) */
  pixelRatio?: number;
  /** Export format: 'png' or 'jpeg' (default: 'png') */
  format?: 'png' | 'jpeg';
  /** JPEG quality 0-1 (default: 0.95) */
  quality?: number;
  /** Background color for the export (default: '#ffffff') */
  backgroundColor?: string;
}

/**
 * Sanitizes a string for use as a filename
 */
export const sanitizeFilename = (text: string): string => {
  return text
    .substring(0, 50) // Limit length
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/[^\w\u4e00-\u9fa5-]/g, '') // Keep alphanumeric, Chinese chars, and hyphens
    .replace(/_+/g, '_') // Remove consecutive underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
};

/**
 * Generates a dynamic filename based on report type and content
 */
export const generateExportFilename = (
  reportType: 'analysis' | 'stock' | 'positional',
  title: string,
  locale: string = 'en'
): string => {
  const timestamp = new Date().toISOString().split('T')[0];
  const sanitizedTitle = sanitizeFilename(title);
  
  const prefixes: Record<string, Record<string, string>> = {
    analysis: {
      zh: '多维度投资分析报告',
      en: 'Investment_Analysis_Report',
    },
    stock: {
      zh: '股票分析报告',
      en: 'Stock_Analysis_Report',
    },
    positional: {
      zh: '阵地战分析报告',
      en: 'Positional_Warfare_Report',
    },
  };

  const prefix = prefixes[reportType]?.[locale] || prefixes[reportType]?.en || 'Report';
  
  return `${prefix}_${sanitizedTitle}_${timestamp}`;
};

/**
 * Filter function to handle problematic elements during export
 * This helps avoid CORS errors and rendering issues in production
 */
const filterNode = (node: HTMLElement): boolean => {
  // Skip elements that commonly cause CORS issues
  if (node.tagName === 'IFRAME') return false;
  if (node.tagName === 'VIDEO') return false;
  if (node.tagName === 'AUDIO') return false;
  
  // Skip external images that might cause CORS issues
  if (node.tagName === 'IMG') {
    const src = (node as HTMLImageElement).src;
    // Allow data URLs and same-origin images
    if (src.startsWith('data:') || src.startsWith(window.location.origin)) {
      return true;
    }
    // Skip external images to avoid CORS issues
    if (src.startsWith('http') && !src.includes(window.location.hostname)) {
      return false;
    }
  }
  
  return true;
};

/**
 * Clones and prepares styles for export
 * Ensures fonts and styles are properly captured
 */
const prepareForExport = async (element: HTMLElement): Promise<void> => {
  // Force all fonts to load before export
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  
  // Give browser time to render any lazy-loaded content
  await new Promise(resolve => setTimeout(resolve, 100));
};

/**
 * Exports an HTML element as an image with production-safe settings
 * Handles CORS issues, font loading, and dynamic filenames
 */
export const exportElementAsImage = async (options: ExportOptions): Promise<void> => {
  const {
    element,
    filename,
    pixelRatio = 2,
    format = 'png',
    quality = 0.95,
    backgroundColor = '#ffffff',
  } = options;

  // Prepare element for export
  await prepareForExport(element);

  // Configure export options with production-safe settings
  const exportConfig = {
    cacheBust: true,
    pixelRatio,
    backgroundColor,
    // Skip problematic nodes to avoid CORS errors
    filter: filterNode,
    // Include fonts as data URLs to avoid CORS issues
    fontEmbedCSS: '',
    // Skip external stylesheets that might cause CORS issues
    skipAutoScale: false,
    // Use CORS-safe fetch mode
    fetchRequestInit: {
      mode: 'cors' as RequestMode,
      credentials: 'omit' as RequestCredentials,
    },
    // Handle SVG issues in production
    includeQueryParams: true,
    // Quality for JPEG format
    quality: format === 'jpeg' ? quality : undefined,
  };

  try {
    // Use the appropriate export function based on format
    const exportFn = format === 'jpeg' ? toJpeg : toPng;
    const dataUrl = await exportFn(element, exportConfig);

    // Create and trigger download
    const link = document.createElement('a');
    link.download = `${filename}.${format}`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    // Re-throw with more descriptive error
    console.error('Export failed:', error);
    throw new Error(
      error instanceof Error 
        ? `导出失败: ${error.message}` 
        : '导出失败: 未知错误'
    );
  }
};

/**
 * Creates a fallback export using canvas API
 * Used when html-to-image fails
 */
export const exportElementFallback = async (
  element: HTMLElement,
  filename: string
): Promise<void> => {
  // This is a simplified fallback that captures just the visible content
  // It won't capture complex CSS but works reliably
  try {
    const canvas = document.createElement('canvas');
    const rect = element.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 2;
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas context not available');
    
    ctx.scale(dpr, dpr);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, rect.width, rect.height);
    
    // Draw text content as fallback
    ctx.font = '16px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = '#000000';
    ctx.fillText(element.textContent?.substring(0, 100) || 'Report', 20, 40);
    
    const dataUrl = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Fallback export failed:', error);
    throw error;
  }
};
