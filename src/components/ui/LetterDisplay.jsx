import { useTheme } from "../../context/ThemeContext";

/**
 * Displays a large Hebrew letter with accessible label.
 * @param {{ symbol: string, name: string, size?: number }} props
 */
export default function LetterDisplay({ symbol, name, size = 100 }) {
  const { dark } = useTheme();
  return (
    <span
      role="img"
      aria-label={name}
      style={{ fontSize: size, lineHeight: 1, direction: "rtl" }}
      className={dark ? "text-indigo-300" : "text-indigo-700"}>
      {symbol}
    </span>
  );
}
