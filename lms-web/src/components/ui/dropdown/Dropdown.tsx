type DropdownProps = {
  options: string[];
};

export default function Dropdown({
  options,
}: DropdownProps) {
  return (
    <select className="w-full border rounded-xl px-4 py-3">
      {options.map((option) => (
        <option
          key={option}
          value={option}
        >
          {option}
        </option>
      ))}
    </select>
  );
}