type SidebarItemProps = {
  label: string;
};

export default function SidebarItem({
  label,
}: SidebarItemProps) {
  return (
    <div className="p-3 rounded-xl hover:bg-gray-100 cursor-pointer">
      {label}
    </div>
  );
}