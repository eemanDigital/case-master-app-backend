// config/modelConfigs.js - Fixed for your Case model
const modelConfigs = {
  Report: {
    searchableFields: ["update", "adjournedFor", "clientEmail"],
    filterableFields: [
      "reportedBy",
      "caseReported",
      "lawyersInCourt",
      "clientEmail",
      "caseId",
      "caseSearch",
      "includeDeleted",
      "onlyDeleted",
    ],
    defaultSort: "-date",
    dateField: "date",
    maxLimit: 50,
    defaultPopulate: [
      {
        path: "caseReported",
        select:
          "firstParty secondParty suitNo courtNo client courtName location state",
      },
      { path: "reportedBy", select: "firstName lastName middleName" },
      { path: "lawyersInCourt", select: "firstName lastName middleName" },
    ],
  },

  Case: {
    searchableFields: [
      "firstParty.name.name",
      "secondParty.name.name",
      "otherParty.name.name",
      "suitNo",
      "courtNo",
      "courtName",
      "location",
      "state",
      "caseSummary",
      "generalComment",
    ],
    filterableFields: [
      "caseStatus",
      "courtName",
      "state",
      "location",
      "category",
      "natureOfCase",
      "casePriority",
      "isFiledByTheOffice",
      "filingDate",
      "accountOfficer",
      "client",
      "includeDeleted",
      "onlyDeleted",
    ],
    defaultSort: "-filingDate",
    dateField: "filingDate",
    maxLimit: 100,
    defaultPopulate: [
      {
        path: "accountOfficer",
        select: "firstName lastName phone email photo",
      },
      {
        path: "client",
        select: "firstName lastName phone email",
      },
    ],
  },

  User: {
    searchableFields: ["firstName", "lastName", "email", "middleName"],
    filterableFields: ["role", "status", "state"],
    defaultSort: "firstName",
    maxLimit: 100,
    defaultPopulate: [],
  },
};

module.exports = modelConfigs;
