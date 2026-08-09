interface AcceptToggleProps {
  isIgnored: boolean;
  onToggle: () => void;
}

export function AcceptToggle({ isIgnored, onToggle }: AcceptToggleProps) {
  return (
    <label
      className="flex items-center space-x-2 cursor-pointer shrink-0"
      onClick={(e) => e.stopPropagation()}
    >
      <span
        className={`text-[10px] font-bold uppercase ${
          !isIgnored ? "text-cyan-500" : "text-zinc-500"
        }`}
      >
        {isIgnored ? "Ignored" : "Accepted"}
      </span>
      <div
        className={`w-8 h-4 rounded-full flex items-center transition-colors p-0.5 ${
          !isIgnored ? "bg-cyan-500" : "bg-zinc-700"
        }`}
      >
        <div
          className={`w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${
            !isIgnored ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </div>
      <input
        type="checkbox"
        className="hidden"
        checked={!isIgnored}
        onChange={onToggle}
      />
    </label>
  );
}
