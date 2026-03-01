import { useCallback, useRef, useState } from 'react';
import {
  UploadCloud,
  X,
  FileText,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

type UploadStatus = 'idle' | 'uploading' | 'success' | 'error';

interface FileEntry {
  file: File;
  status: UploadStatus;
  progress: number;
  error?: string;
  url?: string;
}

interface FileUploadProps {
  /** Chave de recurso para gerar a presigned URL (ex: "deal-attachment", "avatar") */
  resourceType: string;
  /** ID do recurso pai (ex: dealId) */
  resourceId: string;
  /** Tipos MIME aceitos — padrão: todos */
  accept?: string;
  /** Tamanho máximo em bytes — padrão: 10 MB */
  maxSize?: number;
  /** Callback chamado após upload bem-sucedido com a URL final do arquivo */
  onUploadComplete?: (fileUrl: string, fileName: string) => void;
  /** Permitir múltiplos arquivos */
  multiple?: boolean;
}

const BASE = import.meta.env.VITE_API_URL || 'http://localhost:3333';

function authHeaders(): Record<string, string> {
  const token = localStorage.getItem('access_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function requestPresignedUrl(
  resourceType: string,
  resourceId: string,
  fileName: string,
  contentType: string,
): Promise<{ uploadUrl: string; fileUrl: string }> {
  const res = await fetch(`${BASE}/storage/presigned-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({ resourceType, resourceId, fileName, contentType }),
  });
  if (!res.ok) {
    const err = (await res.json()) as { message?: string };
    throw new Error(err.message ?? 'Erro ao obter URL de upload');
  }
  return res.json() as Promise<{ uploadUrl: string; fileUrl: string }>;
}

async function uploadToStorage(
  uploadUrl: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload falhou: HTTP ${xhr.status}`));
    };

    xhr.onerror = () => reject(new Error('Erro de rede durante o upload'));
    xhr.send(file);
  });
}

export function FileUpload({
  resourceType,
  resourceId,
  accept,
  maxSize = 10 * 1024 * 1024,
  onUploadComplete,
  multiple = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);

  const updateEntry = useCallback(
    (index: number, patch: Partial<FileEntry>) => {
      setEntries((prev) =>
        prev.map((e, i) => (i === index ? { ...e, ...patch } : e)),
      );
    },
    [],
  );

  const processFiles = useCallback(
    async (files: File[]) => {
      const validFiles = files.filter((f) => {
        if (f.size > maxSize) return false;
        return true;
      });

      const newEntries: FileEntry[] = validFiles.map((file) => ({
        file,
        status: 'idle',
        progress: 0,
      }));

      setEntries((prev) => (multiple ? [...prev, ...newEntries] : newEntries));

      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const entryIndex = multiple ? entries.length + i : i;

        updateEntry(entryIndex, { status: 'uploading' });

        try {
          const { uploadUrl, fileUrl } = await requestPresignedUrl(
            resourceType,
            resourceId,
            file.name,
            file.type || 'application/octet-stream',
          );

          await uploadToStorage(uploadUrl, file, (progress) =>
            updateEntry(entryIndex, { progress }),
          );

          updateEntry(entryIndex, {
            status: 'success',
            url: fileUrl,
            progress: 100,
          });
          onUploadComplete?.(fileUrl, file.name);
        } catch (err) {
          updateEntry(entryIndex, {
            status: 'error',
            error: err instanceof Error ? err.message : 'Erro desconhecido',
          });
        }
      }
    },
    [
      maxSize,
      multiple,
      entries.length,
      resourceType,
      resourceId,
      updateEntry,
      onUploadComplete,
    ],
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) void processFiles(files);
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) void processFiles(files);
  };

  const handleRemove = (index: number) => {
    setEntries((prev) => prev.filter((_, i) => i !== index));
  };

  const hasUploading = entries.some((e) => e.status === 'uploading');

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-blue-400 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
        }`}
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Área de upload de arquivos"
      >
        <UploadCloud className="mx-auto mb-2 text-gray-400" size={32} />
        <p className="text-sm text-gray-600">
          <span className="font-medium text-blue-600">
            Clique para selecionar
          </span>{' '}
          ou arraste aqui
        </p>
        <p className="text-xs text-gray-400 mt-1">
          Máximo {(maxSize / (1024 * 1024)).toFixed(0)} MB
          {accept ? ` · ${accept}` : ''}
        </p>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
        />
      </div>

      {/* File list */}
      {entries.length > 0 && (
        <ul className="space-y-2">
          {entries.map((entry, i) => (
            <li
              key={`${entry.file.name}-${i}`}
              className="flex items-center gap-3 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm"
            >
              <FileText size={16} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="truncate font-medium text-gray-800">
                  {entry.file.name}
                </p>
                {entry.status === 'uploading' && (
                  <div className="mt-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 transition-all"
                      style={{ width: `${entry.progress}%` }}
                    />
                  </div>
                )}
                {entry.status === 'error' && (
                  <p className="text-xs text-red-500 mt-0.5">{entry.error}</p>
                )}
              </div>

              {entry.status === 'success' && (
                <CheckCircle
                  size={16}
                  className="text-green-500 flex-shrink-0"
                />
              )}
              {entry.status === 'error' && (
                <AlertCircle size={16} className="text-red-500 flex-shrink-0" />
              )}
              {entry.status !== 'uploading' && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 flex-shrink-0"
                  onClick={() => handleRemove(i)}
                  aria-label="Remover"
                >
                  <X size={12} />
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasUploading && (
        <p className="text-xs text-gray-400 text-center">
          Enviando arquivos...
        </p>
      )}
    </div>
  );
}
