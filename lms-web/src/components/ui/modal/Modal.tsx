type ModalProps = {
  title: string;
  children: React.ReactNode;
};

export default function Modal({
  title,
  children,
}: ModalProps) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white rounded-2xl p-8 w-[500px]">
        <h2 className="text-3xl font-bold mb-6">
          {title}
        </h2>

        {children}
      </div>
    </div>
  );
}