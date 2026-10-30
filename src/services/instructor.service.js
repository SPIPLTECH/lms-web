import api from "@/lib/axios";

export const getInstructors = async () => {
    const {data} = await api.get("/teachers");
    return data.data;
};

