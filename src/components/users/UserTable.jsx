"use client";

import Link from "next/link";

export default function UserTable({
  users,
  onDelete,
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border border-slate-800 rounded-xl overflow-hidden">
        <thead>
          <tr className="bg-slate-900 text-left">
            <th className="p-4">
              Name
            </th>

            <th className="p-4">
              Email
            </th>

            <th className="p-4">
              Role
            </th>

            <th className="p-4">
              Status
            </th>

            <th className="p-4">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {users.length === 0 ? (
            <tr>
              <td
                colSpan="5"
                className="p-6 text-center text-slate-400"
              >
                No users found
              </td>
            </tr>
          ) : (
            users.map((user) => (
              <tr
                key={user.id}
                className="border-t border-slate-800 hover:bg-slate-900"
              >
                <td className="p-4">
                  {user.name}
                </td>

                <td className="p-4">
                  {user.email}
                </td>

                <td className="p-4">
                  <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-sm">
                    {user.role}
                  </span>
                </td>

                <td className="p-4">
                  <span
                    className={`
                      px-3 py-1 rounded-full text-sm
                      ${
                        user.status ===
                        "ACTIVE"
                          ? "bg-green-600"
                          : ""
                      }
                      ${
                        user.status ===
                        "INACTIVE"
                          ? "bg-gray-600"
                          : ""
                      }
                      ${
                        user.status ===
                        "BLOCKED"
                          ? "bg-red-600"
                          : ""
                      }
                      ${
                        user.status ===
                        "SUSPENDED"
                          ? "bg-yellow-600"
                          : ""
                      }
                    `}
                  >
                    {user.status}
                  </span>
                </td>

                <td className="p-4">
                  <div className="flex gap-2">
                    <Link
                      href={`/admin/users/${user.id}`}
                      className="bg-blue-600 px-3 py-1 rounded"
                    >
                      View
                    </Link>

                    <Link
                      href={`/admin/users/edit/${user.id}`}
                      className="bg-orange-600 px-3 py-1 rounded"
                    >
                      Edit
                    </Link>

                    <button
                      onClick={() =>
                        onDelete(
                          user.id
                        )
                      }
                      className="bg-red-600 px-3 py-1 rounded"
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}