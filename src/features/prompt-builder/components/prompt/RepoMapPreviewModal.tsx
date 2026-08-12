import { Eye, Map, X } from "lucide-react";

interface RepoMapHeaderProps {
  repoMapTokens: number;
  filesCount: number;
  onOpenModal: () => void;
}

export function RepoMapHeader({
  repoMapTokens,
  filesCount,
  onOpenModal,
}: RepoMapHeaderProps) {
  return (
    <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-lg flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className="p-2 bg-cyan-500/10 rounded">
          <Map className="w-4 h-4 text-cyan-500" />
        </div>
        <div>
          <p className="text-xs font-semibold text-zinc-200">Repo Map Ready</p>
          <p className="text-[10px] text-zinc-500">
            ~{repoMapTokens.toLocaleString()} map tokens / {filesCount} files
          </p>
        </div>
      </div>
      <button
        onClick={onOpenModal}
        className="text-zinc-400 hover:text-zinc-200 transition-colors p-1 rounded hover:bg-zinc-800"
        title="Preview Repo Map"
      >
        <Eye className="w-4 h-4" />
      </button>
    </div>
  );
}

interface RepoMapPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  repoMap: string;
  repoMapTokens: number;
  onCopyMap: (mapText: string) => void;
}

export function RepoMapPreviewModal({
  isOpen,
  onClose,
  repoMap,
  repoMapTokens,
  onCopyMap,
}: RepoMapPreviewModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-2xl flex flex-col overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-zinc-900">
          <h2 className="text-sm font-bold text-zinc-200">
            Repo Map Context Preview (~{repoMapTokens.toLocaleString()} tokens)
          </h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-200 p-1 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto max-h-[60vh] custom-scrollbar">
          <pre className="font-mono text-xs text-zinc-300 bg-zinc-900 p-4 rounded-lg border border-zinc-800 whitespace-pre-wrap">
            {repoMap || "Generating Repo Map..."}
          </pre>
        </div>

        <div className="p-4 border-t border-zinc-800 bg-zinc-900 flex justify-end space-x-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors border border-zinc-700 cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => {
              onCopyMap(repoMap);
              onClose();
            }}
            className="px-4 py-2 text-sm font-medium text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg transition-colors shadow-lg shadow-cyan-900/20 cursor-pointer"
          >
            Copy Raw Map
          </button>
        </div>
      </div>
    </div>
  );
}
