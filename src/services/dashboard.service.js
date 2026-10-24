import api from "@/lib/axios";

/**
 * Get Admin Dashboard
 */
export const getAdminDashboard = async () => {
    const {data} = await api.get(
        "/dashboard/admin"
    );

    return data.data;
};

