import { registerWebModule, NativeModule } from 'expo';

import { ChangeEventPayload } from './DocumentScanner.types';

type DocumentScannerModuleEvents = {
  onChange: (params: ChangeEventPayload) => void;
}

class DocumentScannerModule extends NativeModule<DocumentScannerModuleEvents> {
  PI = Math.PI;
  async setValueAsync(value: string): Promise<void> {
    this.emit('onChange', { value });
  }
  hello() {
    return 'Hello world! 👋';
  }
};

export default registerWebModule(DocumentScannerModule, 'DocumentScannerModule');
