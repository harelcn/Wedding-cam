import { describe, it, expect, vi } from 'vitest';

vi.mock('qrcode', () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue('data:image/png;base64,mocked'),
  },
}));

import QRCode from 'qrcode';
import { generateQrDataUrl } from '../../src/lib/qrCode';

describe('generateQrDataUrl', () => {
  it('delegates to qrcode.toDataURL with the given text and returns its result', async () => {
    const result = await generateQrDataUrl('https://example.com/join/abc');

    expect(QRCode.toDataURL).toHaveBeenCalledWith('https://example.com/join/abc', {
      width: 512,
      margin: 2,
    });
    expect(result).toBe('data:image/png;base64,mocked');
  });
});
