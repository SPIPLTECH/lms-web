export default function StatusSelector({
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
          ACTIVE
        </option>
  
        <option>
          INACTIVE
        </option>
  
        <option>
          BLOCKED
        </option>
  
        <option>
          SUSPENDED
        </option>
      </select>
    );
  }