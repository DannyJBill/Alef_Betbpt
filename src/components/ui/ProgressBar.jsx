import { useTheme } from "../../context/ThemeContext";

/**
 * @param {{ pct: number, color?: string, height?: string }} props
 * pct — 0..100
 */
export default function ProgressBar({ pct, color = "bg-indigo-500", height = "h-1.5" }) {
  const { dark } = useTheme();
  return (
    <div className={`w-full ${height} rounded-full ${dark ? "bg-gray-700" : "bg-gray-200"}`}>
      <div
        className={`${height} ${color} rounded-full transition-all`}
        style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
      />
    </div>
  );
}
