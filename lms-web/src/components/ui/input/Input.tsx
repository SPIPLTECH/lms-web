type InputProps = {
  type?: string;
  placeholder?: string;
};

export default function Input({
  type = "text",
  placeholder,
}: InputProps) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className="w-full border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-orange-500"
    />
  );
}