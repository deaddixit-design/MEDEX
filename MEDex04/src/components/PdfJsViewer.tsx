import React, { useEffect, useRef, useState } from 'react';
import { Loader2, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, FileText, ExternalLink, Download, Layers, BookOpen, ArrowUp, ArrowDown } from 'lucide-react';

interface PdfJsViewerProps {
  url: string;
  title: string;
  allowDownload?: boolean;
}

interface PdfPageCanvasProps {
  pdfDoc: any;
  pageNumber: number;
  zoom: number;
  containerWidth: number;
  isMobile: boolean;
}

// Sub-component to manage clean, isolated rendering of individual pages to canvas
function PdfPageCanvas({ pdfDoc, pageNumber, zoom, containerWidth, isMobile }: PdfPageCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const renderTaskRef = useRef<any>(null);
  const [rendering, setRendering] = useState(true);

  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isMounted = true;
    const renderPage = async () => {
      try {
        setRendering(true);
        const page = await pdfDoc.getPage(pageNumber);
        if (!isMounted) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Cancel previous rendering task if any
        if (renderTaskRef.current) {
          renderTaskRef.current.cancel();
        }

        const unscaledViewport = page.getViewport({ scale: 1.0 });
        const wrapperPadding = isMobile ? 8 : 24;
        const availableWidth = Math.max((containerWidth || 375) - wrapperPadding, 270);
        
        const fitScale = availableWidth / unscaledViewport.width;
        const finalScale = fitScale * zoom;

        // Retina display and high-quality DPI booster
        const dpr = window.devicePixelRatio || 1;
        const scaleMultiplier = Math.max(dpr, 2.0);

        const viewport = page.getViewport({ scale: finalScale * scaleMultiplier });
        
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);

        const displayViewport = page.getViewport({ scale: finalScale });
        canvas.style.width = `${Math.floor(displayViewport.width)}px`;
        canvas.style.height = `${Math.floor(displayViewport.height)}px`;

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
        };

        const renderTask = page.render(renderContext);
        renderTaskRef.current = renderTask;

        await renderTask.promise;
        if (isMounted) {
          setRendering(false);
        }
      } catch (err: any) {
        if (err.name !== 'RenderingCancelledException') {
          console.error(`Error rendering page ${pageNumber}:`, err);
        }
      }
    };

    renderPage();
    return () => {
      isMounted = false;
      if (renderTaskRef.current) {
        renderTaskRef.current.cancel();
      }
    };
  }, [pdfDoc, pageNumber, zoom, containerWidth, isMobile]);

  return (
    <div className="relative bg-white my-4 p-1 sm:p-2.5 shadow-md rounded-2xl border border-zinc-200 overflow-hidden mx-auto flex flex-col items-center">
      <div className="absolute top-3 left-3 bg-zinc-900/85 backdrop-blur text-white font-mono text-[9px] px-2 py-0.5 rounded-lg font-black z-10 shadow border border-zinc-700">
        Page {pageNumber}
      </div>
      {rendering && (
        <div className="absolute inset-0 flex items-center justify-center bg-zinc-50/50 z-0">
          <Loader2 className="w-5 h-5 text-teal-600 animate-spin" />
        </div>
      )}
      <canvas ref={canvasRef} className="max-w-full h-auto block" />
    </div>
  );
}

export function PdfJsViewer({ url, title, allowDownload = true }: PdfJsViewerProps) {
  const [loading, setLoading] = useState(true);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0); // 1.0 represents perfect width fitting
  const [viewMode, setViewMode] = useState<'single' | 'continuous'>('continuous'); // Defaults to Continuous slide scroll view
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [isMobile, setIsMobile] = useState<boolean>(false);
  const [pdfDoc, setPdfDoc] = useState<any>(null);
  const [controlsHidden, setControlsHidden] = useState<boolean>(false);

  const touchStartDistRef = useRef<number | null>(null);
  const touchStartZoomRef = useRef<number>(1.0);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      touchStartDistRef.current = dist;
      touchStartZoomRef.current = zoom;
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && touchStartDistRef.current !== null) {
      if (e.cancelable) {
        e.preventDefault();
      }
      const t1 = e.touches[0];
      const t2 = e.touches[1];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      const factor = dist / touchStartDistRef.current;
      const newZoom = Math.max(0.4, Math.min(2.5, touchStartZoomRef.current * factor));
      setZoom(Number(newZoom.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    touchStartDistRef.current = null;
  };

  // Monitor container size dynamically to optimize column scaling
  useEffect(() => {
    if (!containerRef.current) return;

    const updateDimensions = (width: number) => {
      setContainerWidth(width);
      setIsMobile(width < 640 || window.innerWidth < 640);
    };

    updateDimensions(containerRef.current.clientWidth);

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        updateDimensions(entry.contentRect.width || entry.target.clientWidth);
      }
    });

    resizeObserver.observe(containerRef.current);
    
    const handleWindowResize = () => {
      if (containerRef.current) {
        updateDimensions(containerRef.current.clientWidth);
      }
    };
    window.addEventListener('resize', handleWindowResize);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', handleWindowResize);
    };
  }, []);

  // Load PDF.js dynamically
  useEffect(() => {
    let isMounted = true;
    const loadPdfJs = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!(window as any).pdfjsLib) {
          const script = document.createElement('script');
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js';
          script.async = true;
          document.body.appendChild(script);
          await new Promise((resolve, reject) => {
            script.onload = resolve;
            script.onerror = () => reject(new Error('Failed to load PDF viewer engine.'));
          });
        }
        
        const pdfjsLib = (window as any).pdfjsLib;
        pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';
        
        const loadingTask = pdfjsLib.getDocument(url);
        const pdf = await loadingTask.promise;
        
        if (isMounted) {
          setPdfDoc(pdf);
          setNumPages(pdf.numPages);
          setCurrentPage(1);
          setLoading(false);
        }
      } catch (err: any) {
        console.error('PDF.js loading error:', err);
        if (isMounted) {
          setError(err.message || 'Browser blocked access to this PDF file or the URL is invalid.');
          setLoading(false);
        }
      }
    };

    loadPdfJs();
    return () => {
      isMounted = false;
    };
  }, [url]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNextPage = () => {
    if (numPages && currentPage < numPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(prev + 0.15, 2.5));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(prev - 0.15, 0.4));
  };

  return (
    <div className="w-full h-full flex flex-col space-y-3 font-sans max-w-none relative" id="pdf-viewer-module">
      {/* Floating pull down button for toolbar hidden state */}
      {controlsHidden && (
        <button
          type="button"
          onClick={() => setControlsHidden(false)}
          className="absolute top-2.5 right-2.5 z-50 px-3 py-1.5 bg-zinc-900/95 hover:bg-zinc-800 text-teal-400 border border-zinc-750 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer select-none shadow-md animate-pulse"
          title="Show Reader Toolbar"
        >
          <span>Pull Down Toolbar</span>
          <ArrowDown size={10} />
        </button>
      )}

      {/* Controls Bar */}
      {!controlsHidden && (
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between text-white bg-zinc-900 p-3 rounded-2xl border border-zinc-800 gap-3 shrink-0 relative">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-teal-400 shrink-0" />
            <div className="text-left leading-none">
              <span className="block text-[7px] sm:text-[8px] font-black uppercase tracking-wider text-teal-400 mb-0.5 font-mono">
                Academic Interactive Viewer
              </span>
              <h5 className="text-[11px] sm:text-[12px] font-black text-zinc-150 line-clamp-1 max-w-[200px] sm:max-w-xs">{title}</h5>
            </div>
          </div>

        {/* Reader Navigation & Zoom Controls */}
        {!loading && !error && pdfDoc && (
          <div className="flex flex-wrap items-center gap-2 justify-between md:justify-center">
            {/* View Mode Switcher */}
            <div className="flex bg-zinc-950 p-1 border border-zinc-800 rounded-xl">
              <button
                onClick={() => setViewMode('continuous')}
                className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider transition ${
                  viewMode === 'continuous'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Continuous Scroll Mode"
              >
                <Layers size={11} />
                <span>Scroll</span>
              </button>
              <button
                onClick={() => setViewMode('single')}
                className={`px-2.5 py-1.5 flex items-center gap-1.5 rounded-lg text-[9px] uppercase font-black tracking-wider transition ${
                  viewMode === 'single'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Single Page Mode"
              >
                <BookOpen size={11} />
                <span>Page</span>
              </button>
            </div>

            {/* Pagination Controls (Disabled during scroll view) */}
            {viewMode === 'single' && (
              <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
                <button
                  onClick={handlePrevPage}
                  disabled={currentPage <= 1}
                  className="p-1 hover:bg-zinc-800 text-zinc-300 disabled:opacity-25 rounded transition cursor-pointer"
                  title="Previous Page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[10px] font-mono font-bold text-zinc-300 px-1 whitespace-nowrap">
                  {currentPage} / {numPages}
                </span>
                <button
                  onClick={handleNextPage}
                  disabled={numPages ? currentPage >= numPages : true}
                  className="p-1 hover:bg-zinc-800 text-zinc-300 disabled:opacity-25 rounded transition cursor-pointer"
                  title="Next Page"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            )}

            {/* Slider/Continuous Indicator */}
            {viewMode === 'continuous' && (
              <div className="bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-[10px] font-bold text-zinc-400 font-mono">
                Total Pages: {numPages}
              </div>
            )}

            {/* Zoom Controls */}
            <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={handleZoomOut}
                className="p-1 hover:bg-zinc-800 text-zinc-300 rounded transition cursor-pointer"
                title="Zoom Out"
              >
                <ZoomOut size={13} />
              </button>
              <span className="text-[10px] font-mono font-black text-zinc-300 w-10 text-center leading-none">
                {Math.round(zoom * 100)}%
              </span>
              <button
                onClick={handleZoomIn}
                className="p-1 hover:bg-zinc-800 text-zinc-300 rounded transition cursor-pointer"
                title="Zoom In"
              >
                <ZoomIn size={13} />
              </button>
            </div>

            {zoom !== 1.0 && (
              <button
                onClick={() => setZoom(1.0)}
                className="text-[9px] font-black tracking-wider uppercase px-2.5 py-1.5 bg-zinc-950 hover:bg-zinc-850 text-teal-400 rounded-xl border border-zinc-800 transition cursor-pointer shadow-inner"
              >
                Fit
              </button>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {allowDownload ? (
            <div className="flex gap-1.5 flex-1">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-[9px] bg-zinc-850 hover:bg-zinc-800 text-teal-400 border border-zinc-750 font-black uppercase tracking-wider px-3 py-2 rounded-xl transition cursor-pointer"
              >
                <ExternalLink size={11} />
                <span>Open in Tab</span>
              </a>
              <a
                href={url}
                download={title}
                className="flex-1 md:flex-none flex items-center justify-center gap-1.5 text-[9px] bg-teal-600 hover:bg-teal-555 text-white font-black uppercase tracking-wider px-3 py-2 rounded-xl transition cursor-pointer shadow"
              >
                <Download size={11} />
                <span>Save</span>
              </a>
            </div>
          ) : (
            <div className="px-3.5 py-2 rounded-xl border border-teal-555/20 bg-teal-900/40 text-teal-350 text-[10px] font-black uppercase tracking-widest flex items-center gap-1">
              🛡️ Safe Readable View Enabled
            </div>
          )}

          <button
            type="button"
            onClick={() => setControlsHidden(true)}
            className="px-2.5 py-2 bg-zinc-800 hover:bg-zinc-750 hover:text-white border border-zinc-700 rounded-xl text-[9px] font-black uppercase tracking-wider transition hover:text-teal-300 flex items-center gap-1.5 shrink-0 cursor-pointer select-none"
            title="Pull Up Reader Toolbar"
          >
            <span>Pull Up Toolbar</span>
            <ArrowUp size={11} />
          </button>
        </div>
      </div>
    )}

      {/* Main Canvas Area */}
      <div 
        ref={containerRef}
        className="w-full flex-1 rounded-2xl border border-zinc-350 bg-zinc-100 p-2 overflow-y-auto flex flex-col justify-start shadow-inner min-h-[480px] relative scrollbar-thin"
        id="book-canvas-scrolling-container"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-zinc-100 z-20 space-y-3">
            <Loader2 className="w-8 h-8 text-teal-600 animate-spin" />
            <div className="text-center">
              <p className="text-xs font-black text-zinc-850">Loading Study Document...</p>
              <p className="text-[10px] text-zinc-500 font-medium font-mono mt-0.5">Assembling pages with high-definition rendering</p>
            </div>
          </div>
        )}

        {error && (
          <div className="w-full max-w-md mx-auto my-12 bg-white rounded-3xl border border-red-100 p-6 shadow-md text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 border border-red-100 mx-auto flex items-center justify-center font-black text-lg">
              !
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-black text-red-950 uppercase tracking-wider">Preview Blocked by Sandbox</h4>
              <p className="text-xs text-zinc-500 leading-relaxed font-semibold">
                {error}
              </p>
            </div>
            <div className="bg-zinc-50 p-4 rounded-2xl text-[10px] text-left text-zinc-650 leading-relaxed border border-zinc-200">
              <strong className="block text-zinc-900 mb-1">How can I read this?</strong>
              Secure developer virtual workspaces have sandbox protections. Simply click **"Open in Tab"** or **"New Tab"** above to view/save the document without any restrictions!
            </div>
            {allowDownload ? (
              <div className="pt-2 flex gap-2">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 bg-teal-600 hover:bg-teal-700 text-white font-black rounded-xl text-xs uppercase tracking-wider transition shadow-sm"
                >
                  <ExternalLink size={12} />
                  <span>New Tab</span>
                </a>
                <a
                  href={url}
                  download={title}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 py-3 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-black rounded-xl text-xs uppercase tracking-wider transition border border-zinc-800 shadow-sm"
                >
                  <Download size={12} />
                  <span>Download</span>
                </a>
              </div>
            ) : (
              <div className="pt-2">
                <div className="p-3 bg-zinc-50 border border-zinc-200 text-zinc-500 text-xs rounded-xl font-bold italic">
                  Download and separate tab view permissions restricted by author.
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && !error && pdfDoc && (
          <div className="w-full h-full max-w-full">
            {viewMode === 'single' ? (
              <PdfPageCanvas
                pdfDoc={pdfDoc}
                pageNumber={currentPage}
                zoom={zoom}
                containerWidth={containerWidth}
                isMobile={isMobile}
              />
            ) : (
              <div className="space-y-2 flex flex-col justify-start">
                {Array.from({ length: numPages || 0 }).map((_, idx) => (
                  <PdfPageCanvas
                    key={idx + 1}
                    pdfDoc={pdfDoc}
                    pageNumber={idx + 1}
                    zoom={zoom}
                    containerWidth={containerWidth}
                    isMobile={isMobile}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
