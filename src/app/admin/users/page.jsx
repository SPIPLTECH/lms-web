"use client";

import {
  useEffect,
  useState,
} from "react";

import UserTable from "@/components/users/UserTable";

import {
  getUsers,
  deleteUser,
} from "@/services/user.service";

export default function UsersPage() {
  const [users, setUsers] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  const loadUsers =
    async () => {
      try {
        const response =
          await getUsers();

        setUsers(
          response.data
        );
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    console.log(users);
  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete =
    async (userId) => {
      const confirmed =
        confirm(
          "Delete this user?"
        );

      if (!confirmed) return;

      try {
        await deleteUser(
          userId
        );

        loadUsers();
      } catch (error) {
        console.error(error);
      }
    };

  if (loading) {
    return (
      <div className="text-white p-6">
        Loading...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
      <h1 className="text-3xl font-bold mb-6">
        User Management
      </h1>

      <UserTable
        users={users}
        onDelete={
          handleDelete
        }
      />
    </div>
  );
}