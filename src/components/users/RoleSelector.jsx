export default function RoleSelector({
    value,
    onChange,
  }) {
    return (
      <select
        value={value}
        onChange={onChange}
        className="bg-slate-800 border border-slate-700 p-2 rounded"
      >
        <option>
          ADMIN
        </option>
  
        <option>
          TEACHER
        </option>
  
        <option>
          STUDENT
        </option>
      </select>
    );
  }