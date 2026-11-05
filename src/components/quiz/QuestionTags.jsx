/**
 * A question's tags as chips above its text, such as the board paper it comes
 * from ("July 2024", "Q.2(B)(i)"). `tags` is stored as one comma-separated
 * string; nothing renders when it is empty.
 */
export default function QuestionTags({ tags, className = "" }) {
  const list = (Array.isArray(tags) ? tags : String(tags ?? "").split(","))
    .map((tag) => String(tag).trim())
    .filter(Boolean);
  if (list.length === 0) return null;

  return (
    <ul className={`flex flex-wrap gap-1.5 ${className}`.trim()} aria-label="Question tags">
      {list.map((tag) => (
        <li
          key={tag}
          className="rounded-md border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs"
        >
          {tag}
        </li>
      ))}
    </ul>
  );
}
