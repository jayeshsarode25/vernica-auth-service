import { CONTACT_QUERY_STATUSES } from "../dtos/contactQuery.dto.js";
import * as contactQueryRepository from "../repositories/contactQuery.repository.js";
import { AppError } from "../utils/error.utils.js";

const DUPLICATE_WINDOW_MS = 5 * 60 * 1000;

const normalizeContactPayload = (payload) => ({
  name: payload.name.trim(),
  email: payload.email.trim().toLowerCase(),
  subject: payload.subject.trim(),
  message: payload.message.trim(),
});

export const submitContactQuery = async (payload) => {
  const normalizedPayload = normalizeContactPayload(payload);
  const duplicateSince = new Date(Date.now() - DUPLICATE_WINDOW_MS);

  const duplicate = await contactQueryRepository.findRecentDuplicate({
    email: normalizedPayload.email,
    message: normalizedPayload.message,
    since: duplicateSince,
  });

  if (duplicate) {
    throw new AppError("Please wait before submitting the same message again.", 429);
  }

  const query = await contactQueryRepository.createContactQuery(normalizedPayload);

  console.info("[contact] query created", {
    queryId: query._id,
    email: query.email,
    subject: query.subject,
  });

  return query;
};

export const getContactQueries = (filters) =>
  contactQueryRepository.findContactQueries(filters);

export const getContactQueryById = async (id) => {
  const query = await contactQueryRepository.findContactQueryById(id);

  if (!query) {
    throw new AppError("Contact query not found", 404);
  }

  return query;
};

export const changeContactQueryStatus = async (id, status) => {
  if (!CONTACT_QUERY_STATUSES.includes(status)) {
    throw new AppError("Invalid contact query status", 400);
  }

  const query = await contactQueryRepository.updateContactQueryStatus(id, status);

  if (!query) {
    throw new AppError("Contact query not found", 404);
  }

  return query;
};

export const removeContactQuery = async (id) => {
  const query = await contactQueryRepository.deleteContactQuery(id);

  if (!query) {
    throw new AppError("Contact query not found", 404);
  }

  return query;
};
