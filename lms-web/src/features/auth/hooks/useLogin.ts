export function useLogin() {
  const login = async (
    email: string,
    password: string
  ) => {
    console.log(email, password);
  };

  return {
    login,
  };
}