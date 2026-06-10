type TableProps = {
  headers: string[];
  rows: string[][];
};

export default function Table({
  headers,
  rows,
}: TableProps) {
  return (
    <div className="overflow-x-auto bg-white rounded-2xl shadow">
      <table className="w-full">
        <thead className="bg-gray-100">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                className="text-left px-6 py-4"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>

        <tbody>
          {rows.map((row, rowIndex) => (
            <tr
              key={rowIndex}
              className="border-t"
            >
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-6 py-4"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}