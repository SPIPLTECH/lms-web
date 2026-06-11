"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const handleSubmit = async (
    e: React.FormEvent<HTMLFormElement>
  ) => {
    e.preventDefault();

    try {
      setLoading(true);

      const response = await fetch(
        "http://localhost:5000/api/auth/login",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const data =
        await response.json();

      console.log(data);

      if (!response.ok) {
        throw new Error(
          data.message || "Login failed"
        );
      }

      document.cookie = `token=${data.token}; path=/`;
      document.cookie = `role=${data.user.role}; path=/`;

      switch (data.user.role) {
        case "ADMIN":
          router.push(
            "/admin/dashboard"
          );
          break;

        case "INSTRUCTOR":
          router.push(
            "/instructor/dashboard"
          );
          break;

        case "STUDENT":
          router.push(
            "/student/dashboard"
          );
          break;

        default:
          router.push("/");
      }
    } catch (error) {
      console.error(error);

      alert("Login Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white p-8 rounded-xl shadow-md">
      <h1 className="text-3xl font-bold mb-6 text-center">
        Login
      </h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        <div>
          <label className="block mb-1">
            Email
          </label>

          <input
            type="email"
            placeholder="Enter email"
            value={email}
            onChange={(e) =>
              setEmail(e.target.value)
            }
            className="w-full border rounded-lg px-4 py-2"
            required
          />
        </div>

        <div>
          <label className="block mb-1">
            Password
          </label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            className="w-full border rounded-lg px-4 py-2"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-orange-500 text-white py-2 rounded-lg"
        >
          {loading
            ? "Logging in..."
            : "Login"}
        </button>
      </form>

      <div className="flex justify-between mt-4 text-sm">
        <Link href="/forgot-password">
          Forgot Password?
        </Link>

        <Link href="/register">
          Register
        </Link>
      </div>
    </div>
  );
}