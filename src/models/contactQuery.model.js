import mongoose from "mongoose";

const contactQuerySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 160,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: 180,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: 3000,
    },
    status: {
      type: String,
      enum: ["pending", "read", "resolved"],
      default: "pending",
      index: true,
    },
  },
  { timestamps: true },
);

contactQuerySchema.index({ createdAt: -1 });
contactQuerySchema.index({ name: "text", email: "text", subject: "text" });

const ContactQuery = mongoose.model("ContactQuery", contactQuerySchema);

export default ContactQuery;
