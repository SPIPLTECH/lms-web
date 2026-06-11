import { useState } from "react";

export function useLocalStorage(key: string, initialValue: string) {
  const [value, setValue] = useState(initialValue);
  return { value, setValue };
}
