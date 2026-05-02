import { useEffect, useState } from 'react';
import validatePassword, { validatePassword as _validatePassword } from '../utils/password';

export default function usePasswordValidation(
  password: string,
  opts?: { name?: string; email?: string }
) {
  const [errors, setErrors] = useState<string[]>([]);

  useEffect(() => {
    if (!password) {
      setErrors([]);
      return;
    }
    const result = validatePassword(password, opts);
    setErrors(result);
  }, [password, opts?.name, opts?.email]);

  return {
    errors,
    isValid: errors.length === 0,
  } as const;
}
