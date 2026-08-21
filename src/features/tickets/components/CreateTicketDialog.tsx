import React, { useState } from "react";
import { TicketType } from "../../../types/ticket";
import { Plus, Trash2, X, ListChecks } from "lucide-react";

interface CreateTicketDialogProps {
  isOpen: boolean;
  onClose: () => void;
  availableScopes?: string[];
  onCreate: (data: {
    title: string;
    type: TicketType;
    scope: string;
    description: string;
    requirements: string[];
  }) => void;
}

export function CreateTicketDialog({
  isOpen,
  onClose,
  availableScopes = [],
  onCreate,
}: CreateTicketDialogProps) {
  const [title, setTitle] = useState("");
  const [type, setType] = useState<TicketType>("feat");
  const [selectedScope, setSelectedScope] = useState(
    availableScopes[0] || "general",
  );
  const [customScope, setCustomScope] = useState("");
  const [isCustomScope, setIsCustomScope] = useState(false);
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState<string[]>([]);
  const [reqInput, setReqInput] = useState("");

  if (!isOpen) return null;

  const handleAddReq = () => {
    const trimmed = reqInput.trim();
    if (!trimmed) return;
    setRequirements((prev) => [...prev, trimmed]);
    setReqInput("");
  };

  const handleRemoveReq = (idx: number) => {
    setRequirements((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleReqKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddReq();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const finalScope = isCustomScope
      ? customScope.trim()
      : selectedScope.trim();

    onCreate({
      title: title.trim(),
      type,
      scope: finalScope,
      description: description.trim(),
      requirements,
    });

    setTitle("");
    setCustomScope("");
    setIsCustomScope(false);
    setDescription("");
    setRequirements([]);
    setReqInput("");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-lg shadow-2xl p-5 max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 border-b border-zinc-800 pb-3">
          <div className="flex items-center space-x-2">
            <Plus className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-zinc-100">
              Create In-Repo Ticket
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 overflow-y-auto custom-scrollbar flex-1 pr-1"
        >
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Title <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Implement token diffing in line viewer"
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-100 font-sans focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1">
                Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as TicketType)}
                className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none cursor-pointer"
              >
                <option value="feat">feat (Feature)</option>
                <option value="fix">fix (Bug Fix)</option>
                <option value="refactor">refactor (Refactor)</option>
                <option value="chore">chore (Task/Maintenance)</option>
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-zinc-400">
                  Scope
                </label>
                <button
                  type="button"
                  onClick={() => setIsCustomScope(!isCustomScope)}
                  className="text-[10px] text-indigo-400 hover:underline cursor-pointer"
                >
                  {isCustomScope ? "Choose existing" : "+ Custom scope"}
                </button>
              </div>

              {isCustomScope ? (
                <input
                  type="text"
                  value={customScope}
                  onChange={(e) => setCustomScope(e.target.value)}
                  placeholder="e.g. auth, billing"
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none"
                />
              ) : (
                <select
                  value={selectedScope}
                  onChange={(e) => setSelectedScope(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none cursor-pointer"
                >
                  {availableScopes.length === 0 ? (
                    <option value="general">general</option>
                  ) : (
                    availableScopes.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))
                  )}
                </select>
              )}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              Description (Context for AI & Team)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the problem, approach, or background..."
              rows={3}
              className="w-full bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg p-3 text-xs text-zinc-100 font-sans focus:outline-none resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1">
              <span className="flex items-center space-x-1.5">
                <ListChecks className="w-3.5 h-3.5 text-indigo-400" />
                <span>
                  Acceptance Criteria / Checklist ({requirements.length})
                </span>
              </span>
            </label>

            <div className="flex items-center space-x-2 mb-2">
              <input
                type="text"
                value={reqInput}
                onChange={(e) => setReqInput(e.target.value)}
                onKeyDown={handleReqKeyDown}
                placeholder="e.g. Add unit test for empty strings (Press Enter)"
                className="flex-1 bg-zinc-950 border border-zinc-800 focus:border-indigo-500 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-sans focus:outline-none"
              />
              <button
                type="button"
                onClick={handleAddReq}
                disabled={!reqInput.trim()}
                className="bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0 cursor-pointer"
              >
                + Add
              </button>
            </div>

            {requirements.length > 0 && (
              <div className="space-y-1.5 max-h-36 overflow-y-auto custom-scrollbar bg-zinc-950/60 border border-zinc-800/80 rounded-lg p-2">
                {requirements.map((req, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between bg-zinc-900/80 px-2.5 py-1 rounded border border-zinc-800 text-xs text-zinc-300 group"
                  >
                    <span className="truncate pr-2 font-mono text-[11px]">
                      • {req}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveReq(idx)}
                      className="text-zinc-500 hover:text-rose-400 p-0.5 transition-colors shrink-0 cursor-pointer"
                      title="Remove requirement"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-400 hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!title.trim()}
              className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 cursor-pointer"
            >
              Save Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}