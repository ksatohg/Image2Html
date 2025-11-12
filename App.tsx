import React, { useState, useCallback, useEffect, useRef } from 'react';
import { convertImageToHtml } from './services/geminiService';

// --- UTILITY FUNCTION ---
const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      const mimeType = result.split(';')[0].split(':')[1];
      if (base64 && mimeType) {
        resolve({ base64, mimeType });
      } else {
        reject(new Error('Failed to parse file data.'));
      }
    };
    reader.onerror = (error) => reject(error);
  });
};

// --- CHILD COMPONENTS ---

// ConversionOptions Component
interface ConversionOptionsProps {
  reproduceColors: boolean;
  onReproduceColorsChange: (checked: boolean) => void;
  fidelity: number;
  onFidelityChange: (value: number) => void;
  disabled: boolean;
}

const ConversionOptions: React.FC<ConversionOptionsProps> = ({
  reproduceColors, onReproduceColorsChange,
  fidelity, onFidelityChange,
  disabled
}) => {
  const fidelityOptions = [
    { label: 'サイズ優先', value: 10 },
    { label: 'バランス', value: 50 },
    { label: '再現性優先', value: 100 },
  ];

  return (
    <section className="bg-slate-800 rounded-lg p-6 shadow-lg mb-8">
      <h2 className="text-xl font-semibold text-slate-200 mb-6">変換オプション</h2>
      <div className="space-y-6">
        {/* Reproduce Colors Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            id="reproduce-colors"
            checked={reproduceColors}
            onChange={(e) => onReproduceColorsChange(e.target.checked)}
            disabled={disabled}
            className="h-5 w-5 rounded bg-slate-700 border-slate-500 text-pink-600 focus:ring-pink-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <label htmlFor="reproduce-colors" className={`ml-3 text-slate-300 ${disabled ? 'text-slate-500 cursor-not-allowed' : 'cursor-pointer'}`}>
            色を再現する
          </label>
        </div>

        {/* Fidelity Radio Buttons */}
        <div className="space-y-2">
          <label className={`text-slate-300 ${disabled ? 'text-slate-500' : ''}`}>
            再現度
          </label>
          <div className="grid grid-cols-3 gap-2 rounded-lg bg-slate-700 p-1">
            {fidelityOptions.map((option) => (
              <div key={option.value}>
                <input
                  type="radio"
                  id={`fidelity-${option.value}`}
                  name="fidelity"
                  value={option.value}
                  checked={fidelity === option.value}
                  onChange={(e) => onFidelityChange(Number(e.target.value))}
                  disabled={disabled}
                  className="sr-only"
                />
                <label
                  htmlFor={`fidelity-${option.value}`}
                  className={`
                    block w-full text-center text-sm font-semibold rounded-md py-2 px-2 transition-colors duration-200
                    ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                    ${fidelity === option.value
                      ? 'bg-pink-600 text-white shadow'
                      : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                    }
                  `}
                >
                  {option.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};


// ImageInput Component
interface ImageInputProps {
  onImageSelect: (file: File) => void;
  onRetry: () => void;
  onCancel: () => void;
  imageFile: File | null;
  isLoading: boolean;
  elapsedTime: number;
  hasResult: boolean;
}

const ImageInput: React.FC<ImageInputProps> = ({ onImageSelect, onRetry, onCancel, imageFile, isLoading, elapsedTime, hasResult }) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageUrl = imageFile ? URL.createObjectURL(imageFile) : null;

  const handleFile = useCallback((file: File | null) => {
    if (file && file.type.startsWith('image/')) {
      onImageSelect(file);
    }
  }, [onImageSelect]);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
      e.dataTransfer.clearData();
    }
  }, [handleFile]);

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isLoading) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };
  
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLDivElement>) => {
    if (!isLoading && e.clipboardData.files.length > 0) {
      handleFile(e.clipboardData.files[0]);
    }
  }, [handleFile, isLoading]);
  
  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  const openFileDialog = () => {
    if (!isLoading) fileInputRef.current?.click();
  };

  return (
    <section className="bg-slate-800 rounded-lg p-6 flex flex-col h-full shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-200">入力イメージ</h2>
        <div className="flex items-center gap-2">
          {isLoading ? (
            <div className="text-slate-400" aria-live="polite">
              変換中... ({elapsedTime}秒)
            </div>
          ) : hasResult && imageFile ? (
            <div className="text-slate-400">
              変換完了 ({elapsedTime}秒)
            </div>
          ) : null}
          {isLoading ? (
            <button
              onClick={onCancel}
              className="px-4 py-2 bg-yellow-500 rounded-md text-white font-semibold hover:bg-yellow-600 transition-colors"
            >
              中断
            </button>
          ) : (
            <button
              onClick={onRetry}
              disabled={!imageFile || isLoading}
              className="px-4 py-2 bg-pink-600 rounded-md text-white font-semibold hover:bg-pink-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
            >
              リトライ
            </button>
          )}
        </div>
      </div>
      <div 
        className={`flex-grow border-2 border-dashed rounded-md transition-colors ${isDragging ? 'border-pink-500 bg-slate-700' : 'border-slate-600'} ${isLoading ? 'cursor-not-allowed' : 'cursor-pointer'}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onPaste={handlePaste}
        onClick={openFileDialog}
        tabIndex={isLoading ? -1 : 0}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileInputChange}
          accept="image/*"
          className="hidden"
          disabled={isLoading}
        />
        {imageUrl ? (
          <div className="w-full h-full flex items-center justify-center p-4">
            <img src={imageUrl} alt="アップロードされたイメージ" className="max-w-full max-h-full object-contain rounded-md" />
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-semibold">イメージをペーストまたはドロップ</p>
            <p className="text-sm">またはクリックしてファイルを選択</p>
          </div>
        )}
      </div>
    </section>
  );
};


// HtmlPreview Component
interface HtmlPreviewProps {
  htmlCode: string | null;
  isLoading: boolean;
  error: string | null;
}

const HtmlPreview: React.FC<HtmlPreviewProps> = ({ htmlCode, isLoading, error }) => {
  const previewContent = `
    <html>
      <head>
        <style>body { background-color: #ffffff; margin: 0; }</style> 
      </head>
      <body>
        <div style="padding: 1rem;">${htmlCode || ''}</div>
      </body>
    </html>
  `;

  const LoadingSkeleton: React.FC = () => (
    <div className="w-full h-full animate-pulse bg-slate-700 rounded-md"></div>
  );

  return (
    <section className="bg-slate-800 rounded-lg p-6 flex flex-col h-96 shadow-lg">
      <h2 className="text-xl font-semibold text-slate-200 mb-4">変換後のイメージ</h2>
      <div className="flex-grow border border-slate-600 rounded-md bg-white overflow-hidden flex items-center justify-center">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
           <div className="text-red-500 p-4 text-center bg-red-900/20 w-full h-full flex items-center justify-center">{error}</div>
        ) : htmlCode ? (
          <iframe
            srcDoc={previewContent}
            title="HTML Preview"
            className="w-full h-full border-0"
            sandbox="allow-scripts"
          />
        ) : (
          <div className="text-slate-500 text-center p-4">プレビューがここに表示されます</div>
        )}
      </div>
    </section>
  );
};


// CodeOutput Component
interface CodeOutputProps {
  htmlCode: string | null;
  isLoading: boolean;
  error: string | null;
}

const CodeOutput: React.FC<CodeOutputProps> = ({ htmlCode, isLoading, error }) => {
  const [copied, setCopied] = useState(false);

  const processedHtml = htmlCode
    ? htmlCode.split('\n').filter(line => line.trim() !== '').join('\n')
    : null;

  const handleCopy = () => {
    if (!processedHtml) return;
    navigator.clipboard.writeText(processedHtml);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    if (!processedHtml) return;

    const fullHtmlContent = `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale-1.0">
  <title>Generated UI</title>
</head>
<body>
${processedHtml}
</body>
</html>`;

    const blob = new Blob([fullHtmlContent], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-ui.html';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const LoadingSkeleton: React.FC = () => (
    <div className="animate-pulse space-y-3 p-1">
      <div className="h-4 bg-slate-700 rounded w-5/6"></div>
      <div className="h-4 bg-slate-700 rounded w-full"></div>
      <div className="h-4 bg-slate-700 rounded w-4/6"></div>
      <div className="h-4 bg-slate-700 rounded w-3/4"></div>
      <div className="h-4 bg-slate-700 rounded w-full"></div>
    </div>
  );

  return (
    <section className="bg-slate-800 rounded-lg p-6 flex flex-col h-96 shadow-lg">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold text-slate-200">変換したHTMLコード</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            disabled={!processedHtml || isLoading}
            className="px-4 py-2 bg-purple-600 rounded-md text-white font-semibold hover:bg-purple-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            {copied ? 'コピーしました！' : 'コピー'}
          </button>
          <button
            onClick={handleDownload}
            disabled={!processedHtml || isLoading}
            className="px-4 py-2 bg-green-600 rounded-md text-white font-semibold hover:bg-green-700 disabled:bg-slate-600 disabled:cursor-not-allowed transition-colors"
          >
            ダウンロード
          </button>
        </div>
      </div>
      <div className="flex-grow bg-slate-900 rounded-md p-4 overflow-auto font-mono text-sm border border-slate-700">
        {isLoading ? (
          <LoadingSkeleton />
        ) : error ? (
            <div className="text-red-400">{error}</div>
        ) : processedHtml ? (
          <pre>
            <code>{processedHtml}</code>
          </pre>
        ) : (
          <div className="text-slate-500">HTMLコードがここに表示されます</div>
        )}
      </div>
    </section>
  );
};

// --- MAIN APP COMPONENT ---
const App: React.FC = () => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [elapsedTime, setElapsedTime] = useState(0);
  const timerRef = useRef<number | null>(null);
  const isCancelledRef = useRef<boolean>(false);
  
  const [reproduceColors, setReproduceColors] = useState<boolean>(true);
  const [fidelity, setFidelity] = useState<number>(50);

  const handleImageSelect = (file: File | null) => {
    if (file) {
      setImageFile(file);
      setGeneratedHtml(null);
      setError(null);
      setElapsedTime(0);
    }
  };

  const processConversion = useCallback(async () => {
    if (!imageFile) return;
    
    isCancelledRef.current = false;
    if (timerRef.current) {
        clearInterval(timerRef.current);
    }
    setElapsedTime(0);
    setIsLoading(true);
    setError(null);
    setGeneratedHtml(null);

    timerRef.current = window.setInterval(() => {
        setElapsedTime(prev => prev + 1);
    }, 1000);

    try {
      const { base64, mimeType } = await fileToBase64(imageFile);
      const html = await convertImageToHtml(base64, mimeType, { reproduceColors, fidelity });
      
      if (isCancelledRef.current) return;
      setGeneratedHtml(html);

    } catch (err) {
      if (isCancelledRef.current) return;
      console.error(err);
      const message = err instanceof Error ? err.message : 'HTMLへの変換中にエラーが発生しました。';
      setError(message + ' しばらくしてからもう一度お試しください。');
    } finally {
      if (!isCancelledRef.current) {
        setIsLoading(false);
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [imageFile, reproduceColors, fidelity]);

  const handleCancel = () => {
    isCancelledRef.current = true;
    setIsLoading(false);
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setError("変換が中断されました。");
  };

  useEffect(() => {
    if (imageFile) {
      processConversion();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [imageFile]);

  const handleRetry = () => {
    if (imageFile) {
      processConversion();
    }
  };

  const hasResult = !!(generatedHtml || error);

  return (
    <div className="bg-slate-900 text-white min-h-screen font-sans">
      <div className="container mx-auto p-4 sm:p-6 md:p-8">
        <header className="text-center mb-8 md:mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-pink-600 py-2">
            Image2Html
          </h1>
          <p className="text-slate-400 mt-4">UI画像をHTMLコードに変換します</p>
        </header>

        <ConversionOptions
          reproduceColors={reproduceColors}
          onReproduceColorsChange={setReproduceColors}
          fidelity={fidelity}
          onFidelityChange={setFidelity}
          disabled={isLoading}
        />
        
        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="flex flex-col gap-8 min-h-[30rem] md:min-h-[40rem]">
            <ImageInput 
              onImageSelect={handleImageSelect} 
              onRetry={handleRetry} 
              onCancel={handleCancel}
              imageFile={imageFile} 
              isLoading={isLoading} 
              elapsedTime={elapsedTime} 
              hasResult={hasResult}
            />
          </div>
          <div className="flex flex-col gap-8">
            <HtmlPreview htmlCode={generatedHtml} isLoading={isLoading} error={error} />
            <CodeOutput htmlCode={generatedHtml} isLoading={isLoading} error={error} />
          </div>
        </main>

        <footer className="text-center mt-12 text-slate-500 text-sm">
          <p>生成されたHTMLは構造的な表現を目的としており、ピクセルパーフェクトな再現を保証するものではありません。</p>
        </footer>
      </div>
    </div>
  );
};

export default App;