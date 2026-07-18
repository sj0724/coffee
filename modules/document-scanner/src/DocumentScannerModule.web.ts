import { registerWebModule, NativeModule } from 'expo';

import type { RectangleCorners } from './DocumentScanner.types';

class DocumentScannerModule extends NativeModule<{}> {
  async detectAndCrop(uri: string): Promise<string> {
    // 웹에서는 네이티브 Vision API를 사용할 수 없으므로 원본을 반환한다.
    return uri;
  }

  async detectCorners(_uri: string): Promise<RectangleCorners | null> {
    return null;
  }

  async cropWithCorners(uri: string, _corners: RectangleCorners): Promise<string> {
    return uri;
  }
}

export default registerWebModule(DocumentScannerModule, 'DocumentScanner');
