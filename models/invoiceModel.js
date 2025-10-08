// const mongoose = require("mongoose");

// const Schema = mongoose.Schema;

// const accountDetailSchema = new mongoose.Schema({
//   accountName: {
//     type: String,
//     required: [true, "Provide account name"],
//     trim: true,
//   },
//   accountNumber: {
//     type: String,
//     required: [true, "Provide account number"],
//     trim: true,
//   },
//   bank: {
//     type: String,
//     required: [true, "Provide bank name"],
//     trim: true,
//   },
//   reference: String,
// });

// const serviceSchema = new Schema({
//   serviceDescriptions: {
//     type: String,
//     required: [true, "Specify work done"],
//     trim: true,
//   },
//   hours: { type: Number, default: 0, min: 0 },
//   date: { type: Date, default: Date.now },
//   feeRatePerHour: { type: Number, default: 0, min: 0 },
//   amount: { type: Number, default: 0, min: 0 },
// });

// const expenseSchema = new Schema({
//   description: {
//     type: String,
//     required: [true, "Describe the expenses"],
//     trim: true,
//   },
//   amount: {
//     type: Number,
//     required: [true, "Provide amount"],
//     default: 0.0,
//     min: 0,
//   },
//   date: { type: Date, default: Date.now },
// });

// const invoiceSchema = new Schema(
//   {
//     case: { type: Schema.Types.ObjectId, ref: "Case" },
//     client: { type: Schema.Types.ObjectId, ref: "User", required: true },
//     workTitle: {
//       type: String,
//       maxlength: [50, "Title should not be more than 50 characters"],
//       required: [true, "Provide nature of work done"],
//     },
//     invoiceReference: String,
//     services: [serviceSchema],
//     expenses: [expenseSchema],
//     dueDate: {
//       type: Date,
//       required: [true, "Due date is required"],
//       validate: {
//         validator: function (v) {
//           return v > new Date();
//         },
//         message: "Due date must be in the future",
//       },
//     },
//     accountDetails: accountDetailSchema,
//     status: {
//       type: String,
//       enum: ["paid", "unpaid", "overdue", "draft"],
//       default: "draft",
//     },
//     paymentInstructionTAndC: {
//       type: String,
//       maxlength: [
//         500, // Increased from 100 to 500 for better flexibility
//         "Payment instruction should not be more than 500 characters",
//       ],
//       trim: true,
//     },
//     taxType: String,
//     taxRate: { type: Number, default: 0.0, min: 0, max: 100 },
//     taxAmount: { type: Number, default: 0.0, min: 0 },
//     totalAmountWithTax: { type: Number, default: 0.0, min: 0 },
//     totalExpenses: { type: Number, default: 0, min: 0 },
//     totalHours: { type: Number, default: 0, min: 0 },
//     totalProfessionalFees: { type: Number, default: 0, min: 0 },
//     previousBalance: { type: Number, default: 0 },
//     totalAmountDue: { type: Number, default: 0, min: 0 },
//     totalInvoiceAmount: { type: Number, default: 0, min: 0 },
//     amountPaid: { type: Number, default: 0, min: 0 },
//   },
//   {
//     timestamps: true,
//     toJSON: { virtuals: true },
//     toObject: { virtuals: true },
//   }
// );

// // Virtual for checking if invoice is overdue
// invoiceSchema.virtual("isOverdue").get(function () {
//   return this.status === "unpaid" && this.dueDate < new Date();
// });

// // Populate middleware
// invoiceSchema.pre(/^find/, function (next) {
//   this.populate({
//     path: "client",
//     select: "firstName secondName email phone",
//   }).populate({
//     path: "case",
//     select: "firstParty secondParty suitNo caseStatus",
//   });
//   next();
// });

// // Reference generator for invoiceReference
// invoiceSchema.pre("save", function (next) {
//   if (this.isNew && !this.invoiceReference) {
//     const timestamp = new Date().getTime();
//     const random = Math.floor(Math.random() * 1000);
//     this.invoiceReference = `INV-${timestamp}-${random}`;
//   }
//   next();
// });

// // Middleware to calculate all financial amounts
// invoiceSchema.pre("save", function (next) {
//   // Calculate total professional fees from services
//   this.totalProfessionalFees = this.services.reduce((total, service) => {
//     // Calculate service amount if not already set
//     if (!service.amount && service.hours && service.feeRatePerHour) {
//       service.amount = service.hours * service.feeRatePerHour;
//     }
//     return total + (service.amount || 0);
//   }, 0);

//   // Calculate total expenses
//   this.totalExpenses = this.expenses.reduce((total, expense) => {
//     return total + (expense.amount || 0);
//   }, 0);

//   // Calculate total hours
//   this.totalHours = this.services.reduce((total, service) => {
//     return total + (service.hours || 0);
//   }, 0);

//   // Calculate base total (professional fees + expenses + previous balance)
//   const baseTotal =
//     this.totalProfessionalFees +
//     this.totalExpenses +
//     (this.previousBalance || 0);

//   // Calculate tax amount
//   this.taxAmount = baseTotal * ((this.taxRate || 0) / 100);

//   // Calculate total amount with tax
//   this.totalAmountWithTax = baseTotal + this.taxAmount;

//   // Calculate total invoice amount (this is the gross amount before payments)
//   this.totalInvoiceAmount = this.totalAmountWithTax;

//   // Calculate total amount due (remaining balance after payments)
//   this.totalAmountDue = Math.max(
//     0,
//     this.totalAmountWithTax - (this.amountPaid || 0)
//   );

//   // Auto-update status based on payments and due date
//   if (this.amountPaid >= this.totalAmountWithTax) {
//     this.status = "paid";
//   } else if (this.dueDate < new Date() && this.status !== "paid") {
//     this.status = "overdue";
//   } else if (this.status === "draft" && this.totalInvoiceAmount > 0) {
//     this.status = "unpaid";
//   }

//   next();
// });

// // Index for better query performance
// invoiceSchema.index({ client: 1, status: 1 });
// invoiceSchema.index({ dueDate: 1 });
// invoiceSchema.index({ invoiceReference: 1 }, { unique: true });

// // Instance method to add payment
// invoiceSchema.methods.addPayment = function (paymentAmount) {
//   this.amountPaid += paymentAmount;

//   if (this.amountPaid >= this.totalAmountWithTax) {
//     this.status = "paid";
//   } else if (this.amountPaid > 0) {
//     this.status = "unpaid"; // Partial payment
//   }

//   return this.save();
// };

// // Static method to find overdue invoices
// invoiceSchema.statics.findOverdueInvoices = function () {
//   return this.find({
//     status: "unpaid",
//     dueDate: { $lt: new Date() },
//   });
// };

// const Invoice = mongoose.model("Invoice", invoiceSchema);

// module.exports = Invoice;
const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const accountDetailSchema = new mongoose.Schema({
  accountName: {
    type: String,
    required: [true, "Provide account name"],
    trim: true,
  },
  accountNumber: {
    type: String,
    required: [true, "Provide account number"],
    trim: true,
  },
  bank: {
    type: String,
    required: [true, "Provide bank name"],
    trim: true,
  },
  reference: String,
});

const serviceSchema = new Schema({
  serviceDescriptions: {
    type: String,
    required: [true, "Specify work done"],
    trim: true,
  },
  hours: { type: Number, default: 0, min: 0 },
  date: { type: Date, default: Date.now },
  feeRatePerHour: { type: Number, default: 0, min: 0 },
  amount: { type: Number, default: 0, min: 0 },
});

const expenseSchema = new Schema({
  description: {
    type: String,
    required: [true, "Describe the expenses"],
    trim: true,
  },
  amount: {
    type: Number,
    required: [true, "Provide amount"],
    default: 0.0,
    min: 0,
  },
  date: { type: Date, default: Date.now },
});

// Payment tracking schema
const paymentSchema = new Schema({
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  paymentDate: {
    type: Date,
    default: Date.now,
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "bank_transfer", "cheque", "card", "other"],
  },
  reference: String,
  notes: String,
});

const invoiceSchema = new Schema(
  {
    case: { type: Schema.Types.ObjectId, ref: "Case" },
    client: { type: Schema.Types.ObjectId, ref: "User", required: true },
    workTitle: {
      type: String,
      maxlength: [50, "Title should not be more than 50 characters"],
      required: [true, "Provide nature of work done"],
    },
    invoiceReference: String,
    services: [serviceSchema],
    expenses: [expenseSchema],
    payments: [paymentSchema], // Track individual payments
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      // Removed future date validation to allow editing overdue invoices
    },
    accountDetails: accountDetailSchema,
    status: {
      type: String,
      enum: ["paid", "unpaid", "partially_paid", "overdue", "draft"],
      default: "draft",
    },
    issuedDate: {
      type: Date,
      default: null, // Set when invoice is published/sent
    },
    paymentInstructionTAndC: {
      type: String,
      maxlength: [
        500,
        "Payment instruction should not be more than 500 characters",
      ],
      trim: true,
    },
    taxType: String,
    taxRate: { type: Number, default: 0.0, min: 0, max: 100 },
    taxAmount: { type: Number, default: 0.0, min: 0 },
    totalAmountWithTax: { type: Number, default: 0.0, min: 0 },
    totalExpenses: { type: Number, default: 0, min: 0 },
    totalHours: { type: Number, default: 0, min: 0 },
    totalProfessionalFees: { type: Number, default: 0, min: 0 },
    previousBalance: { type: Number, default: 0 }, // This should be post-tax amount from previous invoices
    previousBalanceIncludesTax: { type: Boolean, default: true }, // Flag to clarify tax handling
    totalAmountDue: { type: Number, default: 0, min: 0 },
    totalInvoiceAmount: { type: Number, default: 0, min: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual for checking if invoice is overdue
invoiceSchema.virtual("isOverdue").get(function () {
  return (
    (this.status === "unpaid" || this.status === "partially_paid") &&
    this.dueDate < new Date() &&
    this.issuedDate !== null
  );
});

// Populate middleware
invoiceSchema.pre(/^find/, function (next) {
  this.populate({
    path: "client",
    select: "firstName secondName email phone",
  }).populate({
    path: "case",
    select: "firstParty secondParty suitNo caseStatus",
  });
  next();
});

// Reference generator for invoiceReference
invoiceSchema.pre("save", function (next) {
  if (this.isNew && !this.invoiceReference) {
    const timestamp = new Date().getTime();
    const random = Math.floor(Math.random() * 1000);
    this.invoiceReference = `INV-${timestamp}-${random}`;
  }
  next();
});

// Middleware to calculate all financial amounts
invoiceSchema.pre("save", function (next) {
  // Calculate total professional fees from services
  this.totalProfessionalFees = this.services.reduce((total, service) => {
    // Calculate service amount if not already set
    if (!service.amount && service.hours && service.feeRatePerHour) {
      service.amount = service.hours * service.feeRatePerHour;
    }
    return total + (service.amount || 0);
  }, 0);

  // Calculate total expenses
  this.totalExpenses = this.expenses.reduce((total, expense) => {
    return total + (expense.amount || 0);
  }, 0);

  // Calculate total hours
  this.totalHours = this.services.reduce((total, service) => {
    return total + (service.hours || 0);
  }, 0);

  // Calculate base total for current invoice (professional fees + expenses)
  const currentInvoiceTotal = this.totalProfessionalFees + this.totalExpenses;

  // Calculate tax on current invoice only (not on previous balance if it already includes tax)
  let taxableAmount = currentInvoiceTotal;

  // If previous balance doesn't include tax, add it to taxable amount
  if (!this.previousBalanceIncludesTax && this.previousBalance) {
    taxableAmount += this.previousBalance;
  }

  this.taxAmount = taxableAmount * ((this.taxRate || 0) / 100);

  // Calculate total amount with tax
  // If previous balance includes tax, just add it; otherwise it's already in taxableAmount
  if (this.previousBalanceIncludesTax) {
    this.totalAmountWithTax =
      currentInvoiceTotal + this.taxAmount + (this.previousBalance || 0);
  } else {
    this.totalAmountWithTax = taxableAmount + this.taxAmount;
  }

  // Calculate total invoice amount (this is the gross amount before payments)
  this.totalInvoiceAmount = this.totalAmountWithTax;

  // Calculate total amount paid from payments array
  this.amountPaid = this.payments.reduce((total, payment) => {
    return total + (payment.amount || 0);
  }, 0);

  // Calculate total amount due (remaining balance after payments)
  this.totalAmountDue = Math.max(0, this.totalAmountWithTax - this.amountPaid);

  // Auto-update status based on payments and due date
  // Only auto-update if invoice is not in draft status
  if (this.status !== "draft") {
    if (this.amountPaid >= this.totalAmountWithTax) {
      this.status = "paid";
    } else if (this.amountPaid > 0) {
      // Check if overdue
      if (this.dueDate < new Date() && this.issuedDate !== null) {
        this.status = "overdue"; // Overdue takes precedence over partially_paid
      } else {
        this.status = "partially_paid";
      }
    } else {
      // No payment made
      if (this.dueDate < new Date() && this.issuedDate !== null) {
        this.status = "overdue";
      } else {
        this.status = "unpaid";
      }
    }
  }

  next();
});

// Index for better query performance
invoiceSchema.index({ client: 1, status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ invoiceReference: 1 }, { unique: true });
invoiceSchema.index({ issuedDate: 1 });

// Instance method to add payment with validation
invoiceSchema.methods.addPayment = function (
  paymentAmount,
  paymentMethod = "other",
  reference = "",
  notes = ""
) {
  // Validate payment amount
  if (paymentAmount <= 0) {
    throw new Error("Payment amount must be greater than zero");
  }

  // Check for overpayment
  const remainingBalance = this.totalAmountWithTax - this.amountPaid;
  if (paymentAmount > remainingBalance) {
    throw new Error(
      `Payment amount (${paymentAmount}) exceeds remaining balance (${remainingBalance})`
    );
  }

  // Add payment to payments array
  this.payments.push({
    amount: paymentAmount,
    paymentDate: new Date(),
    paymentMethod,
    reference,
    notes,
  });

  // Save will trigger pre-save middleware to recalculate amounts and status
  return this.save();
};

// Instance method to publish/issue invoice
invoiceSchema.methods.publishInvoice = function () {
  if (this.status !== "draft") {
    throw new Error("Only draft invoices can be published");
  }

  if (this.totalInvoiceAmount <= 0) {
    throw new Error("Cannot publish invoice with zero amount");
  }

  this.issuedDate = new Date();
  this.status = "unpaid";

  return this.save();
};

// Static method to find overdue invoices
invoiceSchema.statics.findOverdueInvoices = function () {
  return this.find({
    status: { $in: ["unpaid", "partially_paid"] },
    dueDate: { $lt: new Date() },
    issuedDate: { $ne: null },
  });
};

// Static method to get invoice summary for a client
invoiceSchema.statics.getClientSummary = function (clientId) {
  return this.aggregate([
    { $match: { client: mongoose.Types.ObjectId(clientId) } },
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$totalInvoiceAmount" },
        totalDue: { $sum: "$totalAmountDue" },
      },
    },
  ]);
};

// In invoiceModel.js - Add helper method
invoiceSchema.methods.getPaymentSummary = function () {
  const totalPaid = this.payments.reduce(
    (sum, payment) => sum + payment.amount,
    0
  );
  const remainingBalance = this.totalAmountWithTax - totalPaid;

  return {
    totalPaid,
    remainingBalance,
    isFullyPaid: totalPaid >= this.totalAmountWithTax,
    isOverdue: this.isOverdue,
  };
};

// Static method to update overdue statuses (run this periodically via cron job)
invoiceSchema.statics.updateOverdueStatuses = async function () {
  const overdueInvoices = await this.find({
    status: { $in: ["unpaid", "partially_paid"] },
    dueDate: { $lt: new Date() },
    issuedDate: { $ne: null },
  });

  const updatePromises = overdueInvoices.map((invoice) => {
    invoice.status = "overdue";
    return invoice.save();
  });

  return Promise.all(updatePromises);
};

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;
