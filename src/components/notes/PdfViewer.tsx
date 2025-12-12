import { useEffect, useRef, useState } from "react";
import * as pdfjs from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";
import { File } from "lucide-react";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

interface PdfViewerProps {
  fileUrl: string;
  title?: string;
}

export function PdfViewer({ fileUrl, title }: PdfViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const renderPage = async () => {
      try {
        setLoading(true);
        setError(null);

        const loadingTask = pdfjs.getDocument(fileUrl);
        const pdf = await loadingTask.promise;
        if (cancelled) return;

        const page = await pdf.getPage(1);
        const viewport = page.getViewport({ scale: 1.25 });

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext("2d");
        if (!context) {
          setError("Unable to initialize canvas for PDF preview.");
          return;
        }

        const outputScale = window.devicePixelRatio || 1;
        const width = viewport.width;
        const height = viewport.height;

        canvas.width = width * outputScale;
        canvas.height = height * outputScale;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;

        await page.render({
          canvasContext: context,
          viewport,
          canvas,
        } as any).promise;
      } catch (err) {
        console.error("Error rendering PDF preview", err);
        setError(
          "Unable to load PDF preview. You can still open the file in a new tab from the toolbar.",
        );
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    renderPage();

    return () => {
      cancelled = true;
    };
  }, [fileUrl]);

  return (
    <div className="h-full w-full overflow-auto bg-muted/30 px-4 py-2">
      {loading && !error && (
        <p className="text-sm text-muted-foreground mb-2 text-center">
          Loading PDF preview...
        </p>
      )}

      {error && (
        <div className="flex flex-col items-center text-center text-muted-foreground gap-2 mb-2 max-w-md mx-auto">
          <File className="h-10 w-10" />
          <p className="text-sm font-medium">{error}</p>
        </div>
      )}

      <div className="flex justify-center">
        <canvas
          ref={canvasRef}
          aria-label={title ? `Preview of ${title}` : "PDF preview"}
          className={`h-auto w-auto max-w-full rounded-md shadow-sm bg-background ${
            error ? "hidden" : ""
          }`}
        />
      </div>
    </div>
  );
}
