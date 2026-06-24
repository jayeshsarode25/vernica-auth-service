export const CONTACT_QUERY_STATUSES = ["pending", "read", "resolved"];

export const toContactQueryDto = (query) => {
  if (!query) return null;

  return {
    _id: query._id,
    name: query.name,
    email: query.email,
    subject: query.subject,
    message: query.message,
    status: query.status,
    createdAt: query.createdAt,
    updatedAt: query.updatedAt,
  };
};

export const toContactQueryListDto = (queries) =>
  queries.map((query) => toContactQueryDto(query));
