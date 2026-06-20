"use client";

import {
createContext,
useContext,
useEffect,
useState,
} from "react";

import {
loginUser,
registerUser,
} from "@/services/auth.service";

const AuthContext =
createContext();

export const AuthProvider = ({
children,
}) => {
const [user, setUser] =
useState(null);

const [loading, setLoading] =
useState(true);

useEffect(() => {
const storedUser =
localStorage.getItem("user");

if (storedUser) {
  setUser(
    JSON.parse(storedUser)
  );
}

setLoading(false);

}, []);

const register = async (
data
) => {
return await registerUser(data);
};

const login = async (
credentials
) => {
const response =
await loginUser(
credentials
);

const {
  accessToken,
  refreshToken,
  user,
} = response.data;

localStorage.setItem(
  "accessToken",
  accessToken
);

localStorage.setItem(
  "refreshToken",
  refreshToken
);

localStorage.setItem(
  "user",
  JSON.stringify(user)
);

setUser(user);

return user;

};

const logout = () => {
localStorage.removeItem(
"accessToken"
);

localStorage.removeItem(
  "refreshToken"
);

localStorage.removeItem(
  "user"
);

setUser(null);


};

return (
<AuthContext.Provider
value={{
user,
loading,
login,
register,
logout,
}}
>
{children}
</AuthContext.Provider>
);
};

export const useAuth =
() => useContext(AuthContext);
