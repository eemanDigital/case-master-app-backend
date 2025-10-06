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
    dueDate: {
      type: Date,
      required: [true, "Due date is required"],
      validate: {
        validator: function (v) {
          return v > new Date();
        },
        message: "Due date must be in the future",
      },
    },
    accountDetails: accountDetailSchema,
    status: {
      type: String,
      enum: ["paid", "unpaid", "overdue", "draft"],
      default: "draft",
    },
    paymentInstructionTAndC: {
      type: String,
      maxlength: [
        500, // Increased from 100 to 500 for better flexibility
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
    previousBalance: { type: Number, default: 0 },
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
  return this.status === "unpaid" && this.dueDate < new Date();
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

  // Calculate base total (professional fees + expenses + previous balance)
  const baseTotal =
    this.totalProfessionalFees +
    this.totalExpenses +
    (this.previousBalance || 0);

  // Calculate tax amount
  this.taxAmount = baseTotal * ((this.taxRate || 0) / 100);

  // Calculate total amount with tax
  this.totalAmountWithTax = baseTotal + this.taxAmount;

  // Calculate total invoice amount (this is the gross amount before payments)
  this.totalInvoiceAmount = this.totalAmountWithTax;

  // Calculate total amount due (remaining balance after payments)
  this.totalAmountDue = Math.max(
    0,
    this.totalAmountWithTax - (this.amountPaid || 0)
  );

  // Auto-update status based on payments and due date
  if (this.amountPaid >= this.totalAmountWithTax) {
    this.status = "paid";
  } else if (this.dueDate < new Date() && this.status !== "paid") {
    this.status = "overdue";
  } else if (this.status === "draft" && this.totalInvoiceAmount > 0) {
    this.status = "unpaid";
  }

  next();
});

// Index for better query performance
invoiceSchema.index({ client: 1, status: 1 });
invoiceSchema.index({ dueDate: 1 });
invoiceSchema.index({ invoiceReference: 1 }, { unique: true });

// Instance method to add payment
invoiceSchema.methods.addPayment = function (paymentAmount) {
  this.amountPaid += paymentAmount;

  if (this.amountPaid >= this.totalAmountWithTax) {
    this.status = "paid";
  } else if (this.amountPaid > 0) {
    this.status = "unpaid"; // Partial payment
  }

  return this.save();
};

// Static method to find overdue invoices
invoiceSchema.statics.findOverdueInvoices = function () {
  return this.find({
    status: "unpaid",
    dueDate: { $lt: new Date() },
  });
};

const Invoice = mongoose.model("Invoice", invoiceSchema);

module.exports = Invoice;
