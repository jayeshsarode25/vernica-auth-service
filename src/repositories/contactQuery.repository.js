import ContactQuery from "../models/contactQuery.model.js";

const escapeRegExp = (value = "") =>
  String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const buildSearchFilter = ({ search, name, email, subject, status }) => {
  const filter = {};

  if (status) {
    filter.status = status;
  }

  if (search) {
    const safeSearch = new RegExp(escapeRegExp(search), "i");
    filter.$or = [
      { name: safeSearch },
      { email: safeSearch },
      { subject: safeSearch },
    ];
  }

  if (name) {
    filter.name = new RegExp(escapeRegExp(name), "i");
  }

  if (email) {
    filter.email = new RegExp(escapeRegExp(email), "i");
  }

  if (subject) {
    filter.subject = new RegExp(escapeRegExp(subject), "i");
  }

  return filter;
};

export const createContactQuery = (payload) => ContactQuery.create(payload);

export const findRecentDuplicate = ({ email, message, since }) =>
  ContactQuery.findOne({
    email,
    message,
    createdAt: { $gte: since },
  }).lean();

export const findContactQueries = async ({
  page = 1,
  limit = 10,
  search = "",
  name = "",
  email = "",
  subject = "",
  status = "",
}) => {
  const pageNum = Math.max(Number(page) || 1, 1);
  const limitNum = Math.min(Math.max(Number(limit) || 10, 1), 100);
  const filter = buildSearchFilter({ search, name, email, subject, status });

  const [queries, total] = await Promise.all([
    ContactQuery.find(filter)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum)
      .lean(),
    ContactQuery.countDocuments(filter),
  ]);

  return {
    queries,
    total,
    page: pageNum,
    limit: limitNum,
    totalPages: Math.ceil(total / limitNum) || 1,
  };
};

export const findContactQueryById = (id) => ContactQuery.findById(id).lean();

export const updateContactQueryStatus = (id, status) =>
  ContactQuery.findByIdAndUpdate(
    id,
    { status },
    { new: true, runValidators: true },
  ).lean();

export const deleteContactQuery = (id) => ContactQuery.findByIdAndDelete(id);
