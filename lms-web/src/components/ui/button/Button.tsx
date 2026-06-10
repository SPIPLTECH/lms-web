type ButtonProps = {
  text: string;
  onClick?: () => void;
};

export default function Button({
  text,
  onClick,
}: ButtonProps) {
  return (
    <button
      onClick={onClick}
      className="bg-orange-500 text-white px-6 py-3 rounded-xl hover:bg-orange-600 transition"
    >
      {text}
    </button>
  );
}