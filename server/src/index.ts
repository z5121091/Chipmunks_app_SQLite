import cors, { type CorsOptions } from 'cors';
import express, { type Request, type Response } from 'express';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const app = express();
const port = Number(process.env.PORT || 8080);
const uploadDir = path.resolve(process.cwd(), 'sync-data');
const configuredCorsOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedUploadContentTypes = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }

    if (configuredCorsOrigins.length === 0) {
      callback(null, process.env.NODE_ENV !== 'production');
      return;
    }

    callback(null, configuredCorsOrigins.includes(origin));
  },
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
};

const rawExcelParser = express.raw({
  type: Array.from(allowedUploadContentTypes),
  limit: '50mb',
});

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

const sanitizeSegment = (value?: string) => {
  if (!value) {
    return '';
  }

  return value.replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '');
};

const buildFileName = (prefix: string, nameSuffix?: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const suffix = sanitizeSegment(nameSuffix);
  return suffix ? `${prefix}_${suffix}_${timestamp}.xlsx` : `${prefix}_${timestamp}.xlsx`;
};

const getRawBody = (body: Request['body']): Buffer | null => {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  return null;
};

const hasAllowedContentType = (contentTypeHeader?: string): boolean => {
  if (!contentTypeHeader) {
    return false;
  }

  const contentType = contentTypeHeader.split(';')[0]?.trim().toLowerCase();
  return allowedUploadContentTypes.has(contentType);
};

const hasValidXlsxSignature = (rawBody: Buffer): boolean => {
  if (rawBody.length < 4) {
    return false;
  }

  const signatures = [
    Buffer.from([0x50, 0x4b, 0x03, 0x04]),
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    Buffer.from([0x50, 0x4b, 0x07, 0x08]),
  ];

  return signatures.some((signature) => rawBody.subarray(0, 4).equals(signature));
};

const handleExcelUpload =
  (prefix: string, successMessage: string) => async (req: Request, res: Response) => {
    try {
      const contentTypeHeader = req.headers['content-type'];
      const normalizedContentType = Array.isArray(contentTypeHeader)
        ? contentTypeHeader[0]
        : contentTypeHeader;

      if (!hasAllowedContentType(normalizedContentType)) {
        res.status(415).json({
          success: false,
          message: '仅支持上传 Excel 文件',
        });
        return;
      }

      const rawBody = getRawBody(req.body);

      if (!rawBody || rawBody.length === 0) {
        res.status(400).json({
          success: false,
          message: '上传内容为空',
        });
        return;
      }

      if (!hasValidXlsxSignature(rawBody)) {
        res.status(400).json({
          success: false,
          message: '文件内容不是有效的 Excel xlsx 文件',
        });
        return;
      }

      await mkdir(uploadDir, { recursive: true });

      const nameSuffix =
        typeof req.query.name_suffix === 'string' ? req.query.name_suffix : undefined;
      const fileName = buildFileName(prefix, nameSuffix);
      const filePath = path.join(uploadDir, fileName);

      await writeFile(filePath, rawBody);

      res.status(200).json({
        success: true,
        message: successMessage,
        path: filePath,
        count: 1,
      });
    } catch (error) {
      console.error(`[${prefix}] 上传失败:`, error);
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '服务器处理失败',
      });
    }
  };

app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    port,
  });
});

app.get('/api/v1/health', (_req, res) => {
  res.status(200).json({
    success: true,
    status: 'ok',
    port,
  });
});

app.post('/inbound', rawExcelParser, handleExcelUpload('inbound', '入库数据同步成功'));
app.post('/outbound', rawExcelParser, handleExcelUpload('outbound', '出库数据同步成功'));
app.post('/inventory', rawExcelParser, handleExcelUpload('inventory', '盘点数据同步成功'));
app.post('/labels', rawExcelParser, handleExcelUpload('labels', '标签数据同步成功'));
app.post('/materials', rawExcelParser, handleExcelUpload('materials', '物料数据同步成功'));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
