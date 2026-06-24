import {
  toContactQueryDto,
  toContactQueryListDto,
} from "../dtos/contactQuery.dto.js";
import * as contactQueryService from "../services/contactQuery.service.js";
import { catchAsync } from "../utils/error.utils.js";

export const submitContactQuery = catchAsync(async (req, res) => {
  await contactQueryService.submitContactQuery(req.body);

  res.status(201).json({
    success: true,
    message: "Your message has been submitted successfully.",
  });
});

export const getContactQueries = catchAsync(async (req, res) => {
  const result = await contactQueryService.getContactQueries(req.query);

  res.status(200).json({
    success: true,
    queries: toContactQueryListDto(result.queries),
    pagination: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  });
});

export const getContactQueryById = catchAsync(async (req, res) => {
  const query = await contactQueryService.getContactQueryById(req.params.id);

  res.status(200).json({
    success: true,
    query: toContactQueryDto(query),
  });
});

export const updateContactQueryStatus = catchAsync(async (req, res) => {
  const query = await contactQueryService.changeContactQueryStatus(
    req.params.id,
    req.body.status,
  );

  res.status(200).json({
    success: true,
    message: "Contact query status updated successfully.",
    query: toContactQueryDto(query),
  });
});

export const deleteContactQuery = catchAsync(async (req, res) => {
  await contactQueryService.removeContactQuery(req.params.id);

  res.status(200).json({
    success: true,
    message: "Contact query deleted successfully.",
  });
});
