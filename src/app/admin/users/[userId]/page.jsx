"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useParams,
} from "next/navigation";

import {
  getUserById,
} from "@/services/user.service";

export default function UserDetails() {
  const { userId } =
    useParams();

  const [user, setUser] =
    useState(null);

  useEffect(() => {
    const loadUser =
      async () => {
        try {
          const response =
            await getUserById(
              userId
            );

          setUser(
            response.data
          );
        } catch (error) {
          console.error(error);
        }
      };

    if (userId) {
      loadUser();
    }
  }, [userId]);

  if (!user) {
    return (
      <div className="p-6 text-white">
        Loading...
      </div>
    );
  }

  return (
    <div className="p-6 text-white">
      <h1 className="text-3xl font-bold mb-4">
        User Details
      </h1>

      <div className="bg-slate-900 p-6 rounded-xl">
        <p>Name: {user.name}</p>
        <p>Email: {user.email}</p>
        <p>Role: {user.role}</p>
        <p>Status: {user.status}</p>
      </div>
    </div>
  );
}