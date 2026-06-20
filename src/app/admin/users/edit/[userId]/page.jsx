"use client";

import {
  useEffect,
  useState,
} from "react";

import {
  useRouter,
  useParams,
} from "next/navigation";

import {
  getUserById,
  updateUser,
} from "@/services/user.service";

export default function EditUser() {
  const router =
    useRouter();

  const { userId } =
    useParams();

  const [formData, setFormData] =
    useState({
      name: "",
      email: "",
    });

  useEffect(() => {
    const loadUser =
      async () => {
        try {
          const response =
            await getUserById(
              userId
            );

          setFormData(
            response.data ||
              response
          );
        } catch (error) {
          console.error(error);
        }
      };

    if (userId) {
      loadUser();
    }
  }, [userId]);

  const handleSubmit =
    async (e) => {
      e.preventDefault();

      try {
        await updateUser(
          userId,
          formData
        );

        router.push(
          "/admin/users"
        );
      } catch (error) {
        console.error(error);
      }
    };

    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="w-full max-w-xl bg-slate-900 rounded-2xl shadow-xl p-8">
          <h1 className="text-3xl font-bold text-white mb-6">
            Edit User
          </h1>
    
          <form
            onSubmit={handleSubmit}
            className="space-y-5"
          >
            <div>
              <label className="block text-slate-300 mb-2">
                Name
              </label>
    
              <input
                type="text"
                value={formData.name || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    name: e.target.value,
                  })
                }
                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
    
            <div>
              <label className="block text-slate-300 mb-2">
                Email
              </label>
    
              <input
                type="email"
                value={formData.email || ""}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    email: e.target.value,
                  })
                }
                className="w-full p-3 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
    
            <div className="flex gap-4">
              <button
                type="submit"
                className="flex-1 bg-orange-600 hover:bg-orange-700 transition py-3 rounded-lg text-white font-semibold"
              >
                Update User
              </button>
    
              <button
                type="button"
                onClick={() =>
                  router.push(
                    "/admin/users"
                  )
                }
                className="flex-1 bg-slate-700 hover:bg-slate-600 transition py-3 rounded-lg text-white font-semibold"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    );
}