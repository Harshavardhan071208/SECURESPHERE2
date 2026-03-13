
import { PDFDocument, rgb, degrees } from 'pdf-lib';

/**
 * Adds a watermark to the file blob based on type.
 * Currently supports PDF, Images (PNG, JPEG, WEBP), and Text files.
 * @param blob - The file blob to watermark.
 * @param userId - The user ID to use as watermark text.
 * @param fileName - The original file name (used for type detection fallback).
 * @returns A Promise resolving to the watermarked Blob.
 */
export async function addWatermark(blob: Blob, userId: string, fileName: string): Promise<Blob> {
    const type = blob.type || getMimeTypeFromExtension(fileName);
    console.log(`[WatermarkService] Processing file: ${fileName}`);
    console.log(`[WatermarkService] Detected Type: ${type}, Blob Size: ${blob.size}, User: ${userId}`);

    try {
        if (type === 'application/pdf') {
            console.log('[WatermarkService] Applying PDF watermark...', type);
            return await watermarkPDF(blob, userId);
        } else if (type.startsWith('image/')) {
            console.log('[WatermarkService] Applying Image watermark...', type);
            return await watermarkImage(blob, userId, type); // Pass detected type
        } else if (type.startsWith('text/') || type === 'application/json') {
            console.log('[WatermarkService] Applying Text watermark...', type);
            return await watermarkText(blob, userId);
        } else {
            console.warn(`[WatermarkService] Unsupported type for watermark: ${type}. Returning original.`);
        }
    } catch (error) {
        console.error("[WatermarkService] Watermarking failed, returning original file:", error);
    }

    return blob;
}

/**
 * Adds a diagonal watermark to every page of a PDF.
 */
async function watermarkPDF(blob: Blob, userId: string): Promise<Blob> {
    const arrayBuffer = await blob.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const pages = pdfDoc.getPages();
    const text = `Confidential - ${userId}`;

    pages.forEach((page) => {
        const { width, height } = page.getSize();
        page.drawText(text, {
            x: 50,
            y: height / 2,
            size: 50,
            color: rgb(0.5, 0.5, 0.5), // Light Gray
            rotate: degrees(45),
            opacity: 0.15, // Very High Transparency (Background effect)
        });
    });

    const pdfBytes = await pdfDoc.save();
    // Casting to any to avoid strict Uint8Array vs BlobPart mismatch in some environments
    return new Blob([pdfBytes as any], { type: 'application/pdf' });
}

/**
 * Adds a visible watermark to an image using Canvas API.
 */
async function watermarkImage(blob: Blob, userId: string, mimeType: string = 'image/png'): Promise<Blob> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        const url = URL.createObjectURL(blob);

        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                URL.revokeObjectURL(url);
                resolve(blob);
                return;
            }

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Configure watermark specific styles (Transparent Back-layer effect)
            const text = `User ID: ${userId}`;
            const fontSize = Math.max(20, Math.min(canvas.width, canvas.height) * 0.05);
            ctx.font = `bold ${fontSize}px Arial`;

            // Minimal shadow for legibility without blocking
            ctx.shadowColor = "rgba(0,0,0,0.3)";
            ctx.shadowBlur = 2;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)'; // Highly transparent

            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';

            // Draw watermark in center, diagonal
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.rotate(-Math.PI / 4);
            ctx.fillText(text, 0, 0);
            ctx.restore();

            // Also draw small timestamp
            ctx.font = `${fontSize * 0.5}px Arial`;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            ctx.fillText(new Date().toISOString().split('T')[0], 10, canvas.height - 10);

            canvas.toBlob((newBlob) => {
                URL.revokeObjectURL(url);
                if (newBlob) resolve(newBlob);
                else resolve(blob);
            }, mimeType); // Use detected mimeType
        };

        img.onerror = (e) => {
            console.error("Image load error for watermark:", e);
            URL.revokeObjectURL(url);
            resolve(blob);
        };

        img.src = url;
    });
}

/**
 * Appends watermark text to a text file.
 */
async function watermarkText(blob: Blob, userId: string): Promise<Blob> {
    const text = await blob.text();
    const watermarkedText = `${text}\n\n[Watermark: Downloaded by ${userId} on ${new Date().toISOString()}]`;
    return new Blob([watermarkedText], { type: blob.type });
}

/**
 * Helper to determine MIME type from filename if blob.type is missing/generic.
 */
function getMimeTypeFromExtension(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
        case 'pdf': return 'application/pdf';
        case 'png': return 'image/png';
        case 'jpg':
        case 'jpeg': return 'image/jpeg';
        case 'webp': return 'image/webp';
        case 'txt': return 'text/plain';
        case 'json': return 'application/json';
        default: return 'application/octet-stream';
    }
}
