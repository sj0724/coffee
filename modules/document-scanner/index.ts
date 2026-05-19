import DocumentScannerModule from './src/DocumentScannerModule';
export type { RectangleCorners } from './src/DocumentScanner.types';

/**
 * 이미지에서 사각형을 자동 감지해 원근 보정 후 크롭된 이미지 URI 반환.
 * 사각형을 찾지 못하면 원본 URI 반환.
 */
export function detectAndCrop(imageUri: string): Promise<string> {
  return DocumentScannerModule.detectAndCrop(imageUri);
}

/**
 * 사각형 꼭짓점 좌표만 반환 (0~1 정규화). 못 찾으면 null.
 */
export function detectCorners(imageUri: string) {
  return DocumentScannerModule.detectCorners(imageUri);
}

/**
 * 꼭짓점 좌표를 직접 지정해서 원근 보정 크롭.
 */
export function cropWithCorners(imageUri: string, corners: import('./src/DocumentScanner.types').RectangleCorners) {
  return DocumentScannerModule.cropWithCorners(imageUri, corners);
}
