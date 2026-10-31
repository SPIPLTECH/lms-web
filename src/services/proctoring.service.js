import api from "@/lib/axios";

/** Whether the proctoring checkbox should be offered on this server. */
export const getProctoringConfig = async () => {
    const { data } = await api.get("/proctoring/config");
    return data.data;
};
