import cors from "cors";
import express, { type Request, type Response } from "express";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const app = express();
const port = Number(process.env.PORT || 8080);
const uploadDir = path.resolve(process.cwd(), "sync-data");

const rawExcelParser = express.raw({
  type: [
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "application/octet-stream",
  ],
  limit: "50mb",
});

app.use(cors());
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

const sanitizeSegment = (value?: string) => {
  if (!value) {
    return "";
  }

  return value.replace(/[^a-zA-Z0-9_-]+/g, "_").replace(/^_+|_+$/g, "");
};

const buildFileName = (prefix: string, nameSuffix?: string) => {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const suffix = sanitizeSegment(nameSuffix);
  return suffix ? `${prefix}_${suffix}_${timestamp}.xlsx` : `${prefix}_${timestamp}.xlsx`;
};

const getRawBody = (body: Request["body"]): Buffer | null => {
  if (Buffer.isBuffer(body)) {
    return body;
  }

  if (body instanceof Uint8Array) {
    return Buffer.from(body);
  }

  return null;
};

const handleExcelUpload =
  (prefix: string, successMessage: string) =>
  async (req: Request, res: Response) => {
    try {
      const rawBody = getRawBody(req.body);

      if (!rawBody || rawBody.length === 0) {
        res.status(400).json({
          success: false,
          message: "上传内容为空",
        });
        return;
      }

      await mkdir(uploadDir, { recursive: true });

      const nameSuffix =
        typeof req.query.name_suffix === "string" ? req.query.name_suffix : undefined;
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
        message: error instanceof Error ? error.message : "服务器处理失败",
      });
    }
  };

app.get("/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    port,
  });
});

app.get("/api/v1/health", (_req, res) => {
  res.status(200).json({
    success: true,
    status: "ok",
    port,
  });
});

app.post("/inbound", rawExcelParser, handleExcelUpload("inbound", "入库数据同步成功"));
app.post("/outbound", rawExcelParser, handleExcelUpload("outbound", "出库数据同步成功"));
app.post("/inventory", rawExcelParser, handleExcelUpload("inventory", "盘点数据同步成功"));
app.post("/labels", rawExcelParser, handleExcelUpload("labels", "标签数据同步成功"));
app.post("/materials", rawExcelParser, handleExcelUpload("materials", "物料数据同步成功"));

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}/`);
});
