import api from "@/lib/axios";

export const getConcepts =
  async (subTopicId) => {
    const response =
      await api.get(
        `/concepts?subTopicId=${subTopicId}`
      );

    return response.data;
  };

export const getConceptById =
  async (conceptId) => {
    const response =
      await api.get(
        `/concepts/${conceptId}`
      );

    return response.data;
  };

export const createConcept =
  async (data) => {
    const response =
      await api.post(
        "/concepts",
        data
      );

    return response.data;
  };

export const updateConcept =
  async (
    conceptId,
    data
  ) => {
    const response =
      await api.put(
        `/concepts/${conceptId}`,
        data
      );

    return response.data;
  };

export const deleteConcept =
  async (conceptId) => {
    const response =
      await api.delete(
        `/concepts/${conceptId}`
      );

    return response.data;
  };

export const reorderConcepts =
  async (subTopicId, concepts) => {
    const response =
      await api.patch(
        "/concepts/reorder",
        { subTopicId, concepts }
      );

    return response.data;
  };
