import { NativeModule, requireNativeModule } from 'expo';
import { RectangleCorners } from './DocumentScanner.types';

declare class DocumentScannerModule extends NativeModule<{}> {
  detectAndCrop(uri: string): Promise<string>;
  detectCorners(uri: string): Promise<RectangleCorners | null>;
  cropWithCorners(uri: string, corners: RectangleCorners): Promise<string>;
}

export default requireNativeModule<DocumentScannerModule>('DocumentScanner');
