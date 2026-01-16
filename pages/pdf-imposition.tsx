
import React, { useState, useEffect, useRef, useCallback } from 'react';
import Head from 'next/head';
import { PDFDocument, degrees, rgb } from 'pdf-lib';
import styles from '../styles/PdfImposition.module.css';
import { calculateLayout, mm2pt, LayoutParams, Orientation } from '../src/utils/pdfLayout';

// Icons
const CheckIcon = () => (
  <svg className={styles.checkmark} viewBox="0 0 24 24">
    <path d="M20 6L9 17l-5-5" fill="none" stroke="black" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

export default function PdfImposition() {
  // State
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState<string>('点击选择 PDF 文件');
  const [statusText, setStatusText] = useState<string>('就绪');
  const [progress, setProgress] = useState<number>(0);
  const [isRendering, setIsRendering] = useState<boolean>(false);
  const [pageThumbnails, setPageThumbnails] = useState<HTMLCanvasElement[]>([]);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const dragCounter = useRef(0);
  
  // Params State
  const [nup, setNup] = useState<number>(2);
  const [orient, setOrient] = useState<Orientation>('portrait');
  const [scalePct, setScalePct] = useState<number>(92);
  const [crop, setCrop] = useState({ t: 0, b: 0, l: 0, r: 0 });
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [margin, setMargin] = useState<number>(5);
  const [border, setBorder] = useState<boolean>(false);
  const [borderColor, setBorderColor] = useState<string>('#000000');
  const [borderWidth, setBorderWidth] = useState<number>(1);
  const [previewZoom, setPreviewZoom] = useState<number>(60);
  const [pageRange, setPageRange] = useState<string>(''); // Empty means all
  
  // Refs
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Constants
  const controls = { nup, orient, scalePct, crop, offset, margin, border, borderColor, borderWidth, previewZoom };

  // Helper to parse page range string to 0-based indices array
  const parsePageRange = (rangeStr: string, totalPages: number): number[] => {
    if (!rangeStr.trim()) {
      return Array.from({ length: totalPages }, (_, i) => i);
    }

    const pages = new Set<number>();
    const parts = rangeStr.split(/[,，]/); // Support both English and Chinese commas

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      if (trimmed.includes('-')) {
        const [startStr, endStr] = trimmed.split('-');
        let start = parseInt(startStr);
        let end = parseInt(endStr);

        if (isNaN(start)) continue;
        if (isNaN(end)) end = totalPages;

        // Ensure valid range and bounds
        start = Math.max(1, start);
        end = Math.min(totalPages, end);

        if (start <= end) {
          for (let i = start; i <= end; i++) {
            pages.add(i - 1); // Convert to 0-based
          }
        }
      } else {
        const page = parseInt(trimmed);
        if (!isNaN(page) && page >= 1 && page <= totalPages) {
          pages.add(page - 1);
        }
      }
    }
    
    // Return sorted unique indices
    return Array.from(pages).sort((a, b) => a - b);
  };

  // Helper to get current params
  const getParams = useCallback((): LayoutParams => ({
    nup,
    orientation: orient,
    scalePct,
    crop: {
        t: crop.t / 100,
        b: crop.b / 100,
        l: crop.l / 100,
        r: crop.r / 100
    },
    offset,
    margin,
    border,
    borderColor,
    borderWidth,
    paperSize: orient === 'portrait' ? { w: 210, h: 297 } : { w: 297, h: 210 }
  }), [nup, orient, scalePct, crop, offset, margin, border, borderColor, borderWidth]);

  // Handle File Upload
  const handleGlobalDragEnter = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer && e.dataTransfer.items && e.dataTransfer.items.length > 0) {
       setIsDragging(true);
    }
  };

  const handleGlobalDragLeave = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;
    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  };

  const handleGlobalDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleGlobalDrop = async (e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const file = e.dataTransfer?.files?.[0];
    if (file && file.type === 'application/pdf') {
      setCurrentFile(file);
      setFileName(file.name);
      await renderThumbnails(file);
    } else if (file) {
      alert('请选择有效的 PDF 文件');
    }
  };

  // Global drag events
  useEffect(() => {
      window.addEventListener('dragenter', handleGlobalDragEnter);
      window.addEventListener('dragleave', handleGlobalDragLeave);
      window.addEventListener('dragover', handleGlobalDragOver);
      window.addEventListener('drop', handleGlobalDrop);
      
      return () => {
          window.removeEventListener('dragenter', handleGlobalDragEnter);
          window.removeEventListener('dragleave', handleGlobalDragLeave);
          window.removeEventListener('dragover', handleGlobalDragOver);
          window.removeEventListener('drop', handleGlobalDrop);
      };
  }, []);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCurrentFile(file);
      setFileName(file.name);
      await renderThumbnails(file);
    }
  };

  const renderThumbnails = async (file: File) => {
    setIsRendering(true);
    setStatusText('正在渲染...');
    setProgress(0);
    setPageThumbnails([]);

    try {
      // Dynamic import for pdfjs-dist
      const pdfjsLib = await import('pdfjs-dist');
      if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
      }

      const data = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(data).promise;
      const total = pdf.numPages;
      
      // 优化渲染清晰度：根据设备像素比和页面数量动态调整渲染分辨率
      const pixelRatio = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
      // 如果页数较少(<20)，使用较高分辨率(基准1200px)以获得更好的预览质量
      // 如果页数较多(>20)，降低分辨率(基准800px)以避免内存溢出和提升渲染速度
      const baseHeight = total > 20 ? 800 : 1200;
      const targetHeight = baseHeight * pixelRatio;

      const thumbnails: HTMLCanvasElement[] = [];

      for (let i = 1; i <= total; i++) {
        const page = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: 1 });
        const scale = targetHeight / viewport.height;
        const scaledViewport = page.getViewport({ scale });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;
        
        canvas.width = scaledViewport.width;
        canvas.height = scaledViewport.height;

        await page.render({ canvasContext: context, viewport: scaledViewport, canvas }).promise;
        thumbnails.push(canvas);

        const percent = Math.round((i / total) * 100);
        setProgress(percent);
        setStatusText(`渲染中 ${percent}%`);
      }

      setPageThumbnails(thumbnails);
      setStatusText('就绪');
    } catch (error) {
      console.error('Error rendering PDF:', error);
      setStatusText('渲染出错');
    } finally {
      setIsRendering(false);
    }
  };

  // Update Preview
  const updatePreview = useCallback(() => {
    if (!previewContainerRef.current || pageThumbnails.length === 0) return;

    const container = previewContainerRef.current;
    container.innerHTML = '';
    
    // Reset scroll
    const scrollContainer = container.closest(`.${styles.previewContainer}`);
    if (scrollContainer) scrollContainer.scrollTop = 0;

    // Filter thumbnails based on page range
    // NOTE: pageRange applies to ORIGINAL PDF pages, not imposed sheets.
    // The user wants to select pages from the imposed preview, but imposition is dynamic.
    // "选择的页面是选择预览里面的页面" -> This means selecting output SHEETS.
    
    // Logic:
    // 1. We first layout ALL original pages (or should we?)
    //    Actually, standard imposition tools select ORIGINAL pages to impose.
    //    But the user request is specific: "Select pages from the PREVIEW".
    //    The preview shows the RESULT sheets (e.g., 2-up).
    //    So if I input "1", I want the first sheet of the RESULT PDF.
    
    // Let's implement: 
    // 1. Calculate layout for ALL pages first.
    // 2. Generate ALL sheets.
    // 3. Filter the SHEETS based on range.
    
    const params = getParams();
    const firstPage = pageThumbnails[0];
    const srcAspect = (firstPage.width * (1 - params.crop.l - params.crop.r)) / 
                      (firstPage.height * (1 - params.crop.t - params.crop.b));

    const layout = calculateLayout(params, srcAspect);
    const cssScale = previewZoom / 100;
    const displayScale = 1.5 * cssScale;
    
    const totalSheets = Math.ceil(pageThumbnails.length / params.nup);
    
    // Parse range against TOTAL SHEETS
    const selectedSheetIndices = parsePageRange(pageRange, totalSheets);
    
    if (selectedSheetIndices.length === 0) {
       container.innerHTML = '<div style="color: #666; margin-top: 20px;">没有选择有效的页面</div>';
       return;
    }

    // Render selected sheets
    for (const s of selectedSheetIndices) {
      const wrapper = document.createElement('div');
      wrapper.className = styles.canvasWrapper;
      
      const canvas = document.createElement('canvas');
      canvas.width = layout.pageSize.w * displayScale;
      canvas.height = layout.pageSize.h * displayScale;
      canvas.style.width = `${layout.pageSize.w * cssScale}px`;
      canvas.style.height = `${layout.pageSize.h * cssScale}px`;
      
      const ctx = canvas.getContext('2d');
      if (!ctx) continue;
      
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < params.nup; i++) {
        const pageIndex = s * params.nup + i;
        if (pageIndex >= pageThumbnails.length) break;

        const thumb = pageThumbnails[pageIndex];
        const cell = layout.cells[i];

        const sx = thumb.width * params.crop.l;
        const sy = thumb.height * params.crop.t;
        const sw = thumb.width * (1 - params.crop.l - params.crop.r);
        const sh = thumb.height * (1 - params.crop.t - params.crop.b);

        const destX = cell.x * displayScale;
        const destY = (layout.pageSize.h - cell.y - cell.height) * displayScale;
        const destW = cell.width * displayScale;
        const destH = cell.height * displayScale;

        ctx.drawImage(thumb, sx, sy, sw, sh, destX, destY, destW, destH);

        if (params.border) {
          ctx.strokeStyle = params.borderColor;
          ctx.lineWidth = params.borderWidth * displayScale;
          ctx.strokeRect(destX, destY, destW, destH);
        }
      }

      const pageNum = document.createElement('div');
      pageNum.style.textAlign = 'center';
      const pageNumPill = document.createElement('span');
      pageNumPill.className = styles.pageNumber;
      pageNumPill.textContent = `第 ${s + 1} / ${totalSheets} 页`; // Show absolute sheet number
      pageNum.appendChild(pageNumPill);

      wrapper.appendChild(canvas);
      container.appendChild(wrapper);
      container.appendChild(pageNum);
    }
  }, [pageThumbnails, getParams, previewZoom, pageRange]);

  // Effect to handle Ctrl + Wheel zoom
  useEffect(() => {
    const container = previewContainerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -10 : 10;
        setPreviewZoom(prev => {
          const next = prev + delta;
          return Math.min(Math.max(next, 20), 200);
        });
      }
    };

    // Use non-passive listener to prevent default zoom
    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  // Effect to trigger preview update when params change
  useEffect(() => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      updatePreview();
    }, 50);
  }, [updatePreview]);

  // Generate PDF
  const generatePDF = async () => {
    if (!currentFile) return;
    setStatusText('正在生成 PDF...');
    setIsRendering(true);

    try {
      const arrayBuffer = await currentFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(arrayBuffer);
      const outDoc = await PDFDocument.create();
      
      const params = getParams();
      // Use 1 as dummy aspect since we calculate per page, but we need grid info
      const layout = calculateLayout(params, 1);
      const grid = layout.grid;

      const total = srcDoc.getPageCount();
      
      // Calculate layout structure to determine sheet mapping
      // Note: We need to replicate the exact layout logic to map output sheets to source pages
      // However, pdf-lib doesn't have a direct "sheet" concept, we are building it.
      
      // If pageRange is set, it refers to OUTPUT SHEETS (based on user request).
      // We need to calculate which SOURCE PAGES correspond to the selected OUTPUT SHEETS.
      
      const selectedSheetIndices = parsePageRange(pageRange, Math.ceil(total / params.nup));
      
      if (selectedSheetIndices.length === 0) {
          alert('没有选择有效的导出页面');
          setIsRendering(false);
          setStatusText('就绪');
          return;
      }

      let generatedSheetCount = 0;

      const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
          r: parseInt(result[1], 16) / 255,
          g: parseInt(result[2], 16) / 255,
          b: parseInt(result[3], 16) / 255
        } : { r: 0, g: 0, b: 0 };
      };

      // Iterate through selected sheets
      for (const sheetIndex of selectedSheetIndices) {
        const outPage = outDoc.addPage([layout.pageSize.w, layout.pageSize.h]);
        if (params.orientation === 'landscape') outPage.setRotation(degrees(0));

        // Determine source pages for this sheet
        const startIndex = sheetIndex * params.nup;
        const endIndex = Math.min(startIndex + params.nup, total);
        
        // Copy pages for this sheet
        const batchIndices = [];
        for(let i = startIndex; i < endIndex; i++) batchIndices.push(i);
        
        const srcPages = await outDoc.copyPages(srcDoc, batchIndices);

        const embeddedPages = await Promise.all(srcPages.map(p => {
            const { width, height } = p.getSize();
            const left = width * params.crop.l;
            const right = width * (1 - params.crop.r);
            const bottom = height * params.crop.b;
            const top = height * (1 - params.crop.t);
            return outDoc.embedPage(p, { left, right, bottom, top });
        }));

        for (let i = 0; i < embeddedPages.length; i++) {
            const ep = embeddedPages[i];
            const cell = layout.cells[i];
            
            const cellW = cell.cellW;
            const cellH = cell.cellH;
            
            const epAspect = ep.width / ep.height;
            const cellAspect = cellW / cellH;
            
            let drawW = cellW;
            let drawH = cellH;
            
            if (epAspect > cellAspect) {
                drawH = drawW / epAspect;
            } else {
                drawW = drawH * epAspect;
            }
            
            drawW *= params.scalePct / 100;
            drawH *= params.scalePct / 100;
            
            const cellX = cell.col * cellW + mm2pt(params.margin);
            const cellY = mm2pt(params.margin) + (grid.rows - 1 - cell.row) * cellH;
            
            const dx = cellX + (cellW - drawW) / 2 + mm2pt(params.offset.x);
            const dy = cellY + (cellH - drawH) / 2 + mm2pt(params.offset.y);

            outPage.drawPage(ep, {
                x: dx,
                y: dy,
                width: drawW,
                height: drawH
            });

            if (params.border) {
                const c = hexToRgb(params.borderColor);
                outPage.drawRectangle({
                    x: dx,
                    y: dy,
                    width: drawW,
                    height: drawH,
                    borderColor: rgb(c.r, c.g, c.b),
                    borderWidth: params.borderWidth,
                    opacity: 0,
                    borderOpacity: 1
                });
            }
        }
        generatedSheetCount++;
      }

      const pdfBytes = await outDoc.save();
      const blob = new Blob([pdfBytes as any], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      // Use original filename + suffix
      const originalName = currentFile.name.replace(/\.pdf$/i, '');
      link.download = `${originalName}-拼版.pdf`;
      link.click();
      setStatusText('完成!');
    } catch (e) {
      console.error(e);
      setStatusText('生成失败');
    } finally {
      setIsRendering(false);
    }
  };

  // UI Components
  const LiquidGlass = ({ children, className = '', style = {} }: { children?: React.ReactNode, className?: string, style?: React.CSSProperties }) => (
    <div className={`${styles.liquidGlassWrapper} ${className}`} style={style}>
        <div className={styles.liquidGlassEffect}></div>
        <div className={styles.liquidGlassTint}></div>
        <div className={styles.liquidGlassShine}></div>
        <div className={styles.liquidGlassText}>{children}</div>
    </div>
  );

  const GlassSelect = ({ value, options, onChange }: { value: any, options: {value: any, label: string}[], onChange: (val: any) => void }) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
          setIsOpen(false);
        }
      };
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedLabel = options.find(o => o.value == value)?.label || value;

    return (
      <div className={styles.customSelectWrapper} ref={wrapperRef}>
        <div className={`${styles.inputGlassWrapper} ${styles.liquidGlassWrapper}`} onClick={() => setIsOpen(!isOpen)} style={{cursor: 'pointer'}}>
             <div className={styles.liquidGlassEffect}></div>
             <div className={styles.liquidGlassTint}></div>
             <div className={styles.liquidGlassShine}></div>
             <div className={styles.liquidGlassText} style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 12px'}}>
                <span style={{fontSize: '14px'}}>{selectedLabel}</span>
                <svg width="10" height="6" viewBox="0 0 10 6" fill="none" style={{transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', opacity: 0.6}}>
                    <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
             </div>
        </div>
        
        <div className={`${styles.customSelectOptions} ${isOpen ? styles.open : ''}`}>
             <LiquidGlass style={{width: '100%', height: 'auto', borderRadius: '12px', overflow: 'hidden'}}>
                 <div className={styles.optionsContent}>
                    {options.map(opt => (
                        <div 
                            key={opt.value} 
                            className={`${styles.customOption} ${opt.value == value ? styles.selected : ''}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                 </div>
             </LiquidGlass>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <Head>
        <title>PDF 拼版工具</title>
      </Head>
      
      {/* SVG Filter */}
      <svg style={{ display: 'none' }}>
        <filter id="glass-distortion" x="0%" y="0%" width="100%" height="100%" filterUnits="objectBoundingBox">
            <feTurbulence type="fractalNoise" baseFrequency="0.01" numOctaves="1" seed="5" result="turbulence" />
            <feDisplacementMap in="SourceGraphic" in2="turbulence" scale="20" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </svg>

      <div className={styles.appLayout} id="app">
        <div className={`${styles.globalDragOverlay} ${isDragging ? styles.active : ''}`}>
             <div className={styles.dragContent}>
                 <svg className={styles.dragIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="17 8 12 3 7 8" />
                    <line x1="12" y1="3" x2="12" y2="15" />
                 </svg>
                 <div className={styles.dragTitle}>释放文件以上传</div>
                 <div className={styles.dragSubtitle}>支持 PDF 文件</div>
             </div>
        </div>

        <div className={`${styles.sidebar} ${styles.liquidGlassWrapper}`}>
            <div className={styles.liquidGlassEffect}></div>
            <div className={styles.liquidGlassTint}></div>
            <div className={styles.liquidGlassShine}></div>
            <div className={`${styles.liquidGlassText} ${styles.sidebarContent}`}>
                <div className={styles.header}>
                    <div className={styles.title}>PDF 拼版工具</div>
                    <div className={styles.subtitle}>布局与预览</div>
                </div>

                <div className={styles.controls}>
                    <div className={styles.controlGroup}>
                        <label className={styles.label}>源文件</label>
                        <div 
                            className={`${styles.fileUploadWrapper} ${styles.liquidGlassWrapper}`}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <div className={styles.liquidGlassEffect}></div>
                            <div className={styles.liquidGlassTint}></div>
                            <div className={styles.liquidGlassShine}></div>
                            <div className={`${styles.liquidGlassText} ${styles.fileUploadContent}`}>
                                <input 
                                    type="file" 
                                    ref={fileInputRef}
                                    accept="application/pdf" 
                                    className={styles.fileInputHidden} 
                                    onChange={handleFileChange}
                                />
                                <span>{fileName}</span>
                            </div>
                        </div>
                    </div>

                    <div className={styles.controlGroup}>
                        <label className={styles.label}>布局设置</label>
                        <div className={styles.row}>
                            <GlassSelect 
                                value={nup}
                                onChange={(v) => setNup(Number(v))}
                                options={[
                                    { value: 2, label: '2 页 / 张' },
                                    { value: 4, label: '4 页 / 张' },
                                    { value: 6, label: '6 页 / 张' },
                                    { value: 8, label: '8 页 / 张' },
                                ]}
                            />
                            <GlassSelect 
                                value={orient}
                                onChange={(v) => setOrient(v)}
                                options={[
                                    { value: 'portrait', label: '纵向' },
                                    { value: 'landscape', label: '横向' },
                                ]}
                            />
                        </div>
                    </div>

                    <div className={styles.controlGroup}>
                        <label className={styles.label}>样式设置</label>
                        <div 
                            className={styles.row} 
                            style={{ alignItems: 'center', cursor: 'pointer' }}
                            onClick={() => setBorder(!border)}
                        >
                            <div className={`${styles.checkboxGlass} ${styles.liquidGlassWrapper} ${border ? styles.checked : ''}`}>
                                <div className={styles.liquidGlassEffect}></div>
                                <div className={styles.liquidGlassTint}></div>
                                <div className={styles.liquidGlassShine}></div>
                                <div className={`${styles.liquidGlassText} ${styles.checkboxInner}`}>
                                    <CheckIcon />
                                </div>
                            </div>
                            <span style={{ marginLeft: '10px', fontSize: '14px', fontWeight: 500 }}>显示分割线</span>
                        </div>
                        
                        {border && (
                            <div className={styles.row} style={{ marginTop: '10px' }}>
                                <div className={`${styles.colorPickerWrapper} ${styles.liquidGlassWrapper}`}>
                                    <div className={styles.liquidGlassEffect}></div>
                                    <div className={styles.liquidGlassTint}></div>
                                    <div className={styles.liquidGlassShine}></div>
                                    <div className={`${styles.liquidGlassText} ${styles.colorPickerContent}`}>
                                        <input 
                                            type="color" 
                                            value={borderColor}
                                            onChange={e => setBorderColor(e.target.value)}
                                        />
                                    </div>
                                </div>
                                <div className={`${styles.inputGlassWrapper} ${styles.liquidGlassWrapper}`}>
                                    <div className={styles.liquidGlassEffect}></div>
                                    <div className={styles.liquidGlassTint}></div>
                                    <div className={styles.liquidGlassShine}></div>
                                    <div className={styles.liquidGlassText}>
                                        <input 
                                            type="number" 
                                            value={borderWidth}
                                            min="0.5" max="10" step="0.5"
                                            onChange={e => setBorderWidth(Number(e.target.value))}
                                            placeholder="粗细"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className={styles.controlGroup}>
                        <label className={styles.label}>缩放 ({scalePct}%)</label>
                        <input 
                            type="range" 
                            min="50" max="100" step="1" 
                            value={scalePct}
                            onChange={e => setScalePct(Number(e.target.value))}
                        />
                    </div>

                    <div className={styles.controlGroup}>
                        <label className={styles.label}>裁剪 (上/下/左/右 %)</label>
                        <div className={styles.row}>
                            <LiquidGlass className={styles.inputGlassWrapper}>
                                <input type="number" value={crop.t} onChange={e => setCrop({...crop, t: Number(e.target.value)})} placeholder="上" min="0" max="20" />
                            </LiquidGlass>
                            <LiquidGlass className={styles.inputGlassWrapper}>
                                <input type="number" value={crop.b} onChange={e => setCrop({...crop, b: Number(e.target.value)})} placeholder="下" min="0" max="20" />
                            </LiquidGlass>
                        </div>
                        <div className={styles.row}>
                            <LiquidGlass className={styles.inputGlassWrapper}>
                                <input type="number" value={crop.l} onChange={e => setCrop({...crop, l: Number(e.target.value)})} placeholder="左" min="0" max="20" />
                            </LiquidGlass>
                            <LiquidGlass className={styles.inputGlassWrapper}>
                                <input type="number" value={crop.r} onChange={e => setCrop({...crop, r: Number(e.target.value)})} placeholder="右" min="0" max="20" />
                            </LiquidGlass>
                        </div>
                    </div>

                    <div className={styles.controlGroup}>
                        <label className={styles.label}>偏移 (X/Y mm)</label>
                        <div className={styles.row}>
                            <LiquidGlass className={styles.inputGlassWrapper}>
                                <input type="number" value={offset.x} onChange={e => setOffset({...offset, x: Number(e.target.value)})} placeholder="X" min="-50" max="50" />
                            </LiquidGlass>
                            <LiquidGlass className={styles.inputGlassWrapper}>
                                <input type="number" value={offset.y} onChange={e => setOffset({...offset, y: Number(e.target.value)})} placeholder="Y" min="-50" max="50" />
                            </LiquidGlass>
                        </div>
                    </div>

                    <div className={styles.controlGroup}>
                        <label className={styles.label}>页边距 (mm)</label>
                        <LiquidGlass className={styles.inputGlassWrapper}>
                            <input type="number" value={margin} onChange={e => setMargin(Number(e.target.value))} min="0" max="50" />
                        </LiquidGlass>
                    </div>

                    <div className={styles.controlGroup}>
                        <label className={styles.label}>页面范围 (例如: 1-5, 8)</label>
                        <div className={`${styles.inputGlassWrapper} ${styles.liquidGlassWrapper}`}>
                            <div className={styles.liquidGlassEffect}></div>
                            <div className={styles.liquidGlassTint}></div>
                            <div className={styles.liquidGlassShine}></div>
                            <div className={styles.liquidGlassText}>
                                <input 
                                    type="text" 
                                    value={pageRange} 
                                    onChange={e => setPageRange(e.target.value)} 
                                    placeholder="全部 (留空)" 
                                />
                            </div>
                        </div>
                    </div>
                </div>

                <div className={styles.actionsFooter}>
                    <div className={styles.status}>
                        <span>{isRendering ? '处理中...' : statusText}</span>
                    </div>
                    <button 
                        className={styles.btn} 
                        disabled={!currentFile || isRendering}
                        onClick={generatePDF}
                    >
                        生成 PDF
                    </button>
                </div>
            </div>
        </div>

        <div className={`${styles.mainArea} ${styles.liquidGlassWrapper}`}>
            <div className={styles.liquidGlassEffect}></div>
            <div className={styles.liquidGlassTint}></div>
            <div className={styles.liquidGlassShine}></div>
            <div className={`${styles.liquidGlassText} ${styles.mainAreaContent}`} style={{position: 'relative'}}>
                <div className={styles.previewControls}>
                    <label className={styles.label} style={{marginBottom: '5px', display: 'block'}}>预览缩放 ({previewZoom}%)</label>
                    <input 
                        type="range" 
                        min="20" max="200" step="10" 
                        value={previewZoom}
                        onChange={e => setPreviewZoom(Number(e.target.value))}
                        style={{width: '100%', margin: 0}}
                    />
                </div>
                {isRendering && (
                    <div className={styles.previewProgressOverlay}>
                        <div className={styles.progressCard}>
                            <div className={styles.progressTitle}>{statusText}</div>
                            <div className={styles.progressTrack}>
                                <div className={styles.progressBarFill} style={{ width: `${progress}%` }}></div>
                            </div>
                            <div className={styles.progressText}>{progress}%</div>
                        </div>
                    </div>
                )}
                <div className={styles.previewContainer}>
                    <div className={styles.previewList} ref={previewContainerRef}>
                        <div className={styles.emptyState} style={{ color: '#555', marginTop: '20%' }}>请选择 PDF 文件进行预览</div>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}

