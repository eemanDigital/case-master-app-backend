const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const paymentSchema = new Schema(
  {
    invoiceId: {
      type: Schema.Types.ObjectId,
      ref: "Invoice",
      required: true,
    },

    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },
    caseId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
    },

    amountPaid: {
      type: Number,
      required: true,
    },
    totalAmountDue: {
      type: Number,
      required: true,
    },
    date: {
      type: Date,
      default: Date.now,
      required: [true, "Specify the date payment was received"],
    },
    method: {
      type: String,
      enum: ["credit_card", "bank_transfer", "cash", "cheque"],
      required: true,
    },
    balance: {
      type: Number,
      default: 0.0,
    },
  },

  { timestamps: true },

  {
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// In paymentModel.js - Fix the population
paymentSchema.pre(/^find/, function (next) {
  this.populate({
    path: "invoiceId",
    select: "invoiceReference workTitle totalAmountWithTax",
  })
    .populate({
      path: "clientId",
      select: "firstName secondName email",
    })
    .populate({
      path: "caseId",
      select: "firstParty secondParty suitNo",
    });
  next();
});

module.exports = mongoose.model("Payment", paymentSchema);
