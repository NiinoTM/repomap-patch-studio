interface PromptOptionsProps {
  discoveryMode: boolean;
  onDiscoveryModeChange: (value: boolean) => void;
}

export function PromptOptions({
  discoveryMode,
  onDiscoveryModeChange,
}: PromptOptionsProps) {
  return (
    <div className="space-y-2 text-xs text-zinc-300">
      <label className="flex items-center space-x-2 cursor-pointer">
        <input type="checkbox" defaultChecked className="accent-cyan-500" />
        <span>Enforce SEARCH/REPLACE blocks</span>
      </label>
      <label className="flex items-center space-x-2 cursor-pointer">
        <input
          type="checkbox"
          checked={discoveryMode}
          onChange={(e) => onDiscoveryModeChange(e.target.checked)}
          className="accent-indigo-500"
        />
        <span>
          Discovery Mode
          <span className="text-zinc-500">
            {" "}
            — ask the AI which files it needs before sending any code
          </span>
        </span>
      </label>
    </div>
  );
}