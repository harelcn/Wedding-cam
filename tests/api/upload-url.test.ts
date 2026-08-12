import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: vi.fn().mockResolvedValue('https://example-signed-url.test'),
}));

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: vi.fn().mockImplementation(function S3Client() {
    return {};
  }),
  PutObjectCommand: vi.fn().mockImplementation(function PutObjectCommand(input) {
    return input;
  }),
}));

const maybeSingleMock = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: maybeSingleMock,
        })),
      })),
    })),
  })),
}));

import handler from '../../api/upload-url';

function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe('POST /api/upload-url', () => {
  beforeEach(() => {
    process.env.R2_ACCOUNT_ID = 'test-account';
    process.env.R2_ACCESS_KEY_ID = 'test-key';
    process.env.R2_SECRET_ACCESS_KEY = 'test-secret';
    process.env.R2_BUCKET_NAME = 'test-bucket';
    process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
    process.env.VITE_SUPABASE_ANON_KEY = 'test-anon-key';
    maybeSingleMock.mockReset().mockResolvedValue({ data: { id: 'f1' } });
  });

  it('rejects non-POST methods', async () => {
    const req: any = { method: 'GET' };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(405);
  });

  it('rejects a request with no body at all', async () => {
    const req: any = { method: 'POST' };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a missing folderId', async () => {
    const req: any = { method: 'POST', body: { contentType: 'image/jpeg' } };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects an unsupported contentType', async () => {
    const req: any = { method: 'POST', body: { folderId: 'f1', contentType: 'audio/mpeg' } };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('rejects a folderId that does not exist', async () => {
    maybeSingleMock.mockResolvedValue({ data: null });
    const req: any = { method: 'POST', body: { folderId: 'does-not-exist', contentType: 'image/jpeg' } };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(404);
  });

  it('returns a signed upload URL and matching storage key for valid input', async () => {
    const req: any = { method: 'POST', body: { folderId: 'f1', contentType: 'image/jpeg' } };
    const res = createMockRes();
    await handler(req, res);
    expect(res.status).toHaveBeenCalledWith(200);
    const payload = res.json.mock.calls[0][0];
    expect(payload.uploadUrl).toBe('https://example-signed-url.test');
    expect(payload.storageKey).toMatch(/^f1\/.+\.jpg$/);
  });
});
