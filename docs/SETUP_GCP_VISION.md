# Setting Up Google Cloud Vision (OCR)

OCR is used by `canvas_extract_document_text` and `canvas_resolve_task_files` when processing image files (JPEG, PNG, GIF, BMP, WebP, TIFF).

## When you need this

Only if you expect Canvas assignments or pages to have **image files** (scanned PDFs are handled by pdf-parse, not OCR). If you only deal with PDF/DOCX/TXT, skip this.

Set `OCR_ENABLED=false` to disable OCR entirely — the server starts cleanly without any GCP credentials.

## Step 1 — Create a GCP Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or use an existing one)
3. Note the **Project ID**

## Step 2 — Enable Cloud Vision API

1. In your project, go to **APIs & Services → Library**
2. Search for "Cloud Vision API"
3. Click **Enable**

## Step 3 — Create a Service Account

1. Go to **IAM & Admin → Service Accounts**
2. Click **Create Service Account**
3. Name: `canvas-mcp-ocr` (or any name)
4. Role: **Cloud Vision AI User** (`roles/visionai.user`)
5. Click **Done**

## Step 4 — Generate a JSON Key

1. Click the service account you just created
2. Go to **Keys** tab → **Add Key → Create new key**
3. Choose **JSON** format
4. Download the file — save it somewhere safe, e.g.:
   - Windows: `C:\Users\<you>\.secrets\canvas-mcp-vision.json`
   - macOS/Linux: `~/.secrets/canvas-mcp-vision.json`

**Never commit this file to git.**

## Step 5 — Configure the server

Add to your `.env`:

```env
GOOGLE_APPLICATION_CREDENTIALS=C:\Users\<you>\.secrets\canvas-mcp-vision.json
OCR_ENABLED=true
```

Alternative — API key (simpler, but less secure):

```env
GOOGLE_VISION_API_KEY=AIza...
OCR_ENABLED=true
```

## Step 6 — Verify

```bash
npm run build && npm start
# Then call canvas_extract_document_text on a PNG file
```

## Pricing

`documentTextDetection` costs ~$1.50 per 1,000 images (as of 2024). GCP offers 1,000 free units/month. Monitor usage in **GCP Billing**.

To control costs: lower `OCR_MAX_BYTES` (default 10 MB) to reject large images early.
