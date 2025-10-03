// utils/queryBuilder.js - Fix for case-based filtering
class QueryBuilder {
  static buildMongooseFilter(queryParams, modelConfig = {}) {
    const {
      searchableFields = [],
      filterableFields = [],
      defaultSort = "-createdAt",
      dateField = "createdAt",
    } = modelConfig;

    let filter = {};
    const { search, caseId, caseSearch, ...filters } = queryParams; // Added caseId and caseSearch

    // Text search across multiple fields
    if (search && searchableFields.length > 0) {
      filter.$or = searchableFields.map((field) => ({
        [field]: { $regex: search, $options: "i" },
      }));
    }

    // CASE ID FILTER - Filter by specific case ID
    if (caseId) {
      filter.caseReported = caseId;
    }

    // CASE SEARCH FILTER - Search for cases and get their reports
    if (caseSearch) {
      // This will be handled separately in the service
      filter.caseSearch = caseSearch; // Flag to indicate case search
    }

    // Date range filter
    const dateFilter = {};
    if (filters.startDate) dateFilter.$gte = new Date(filters.startDate);
    if (filters.endDate) dateFilter.$lte = new Date(filters.endDate);

    if (Object.keys(dateFilter).length > 0) {
      filter[dateField] = dateFilter;
    }

    // Handle other filterable fields
    filterableFields.forEach((field) => {
      if (filters[field] !== undefined && filters[field] !== "") {
        if (Array.isArray(filters[field])) {
          filter[field] = { $in: filters[field] };
        } else {
          filter[field] = filters[field];
        }
      }
    });

    // Special handling for soft deletion
    if (filters.includeDeleted === "true") {
      // Include all records
    } else if (filters.onlyDeleted === "true") {
      filter.isDeleted = true;
    } else {
      filter.isDeleted = { $ne: true };
    }

    return filter;
  }

  // Remove the complex aggregation method - we don't need it
  static buildSort(sortQuery, defaultSort = "-createdAt") {
    if (!sortQuery) return defaultSort;

    const sort = {};
    const sortFields = sortQuery.split(",");

    sortFields.forEach((field) => {
      if (field.startsWith("-")) {
        sort[field.substring(1)] = -1;
      } else {
        sort[field] = 1;
      }
    });

    return sort;
  }

  static buildPopulate(populateQuery) {
    if (!populateQuery) return "";
    return populateQuery.split(",").map((path) => ({ path: path.trim() }));
  }

  static sanitizeCriteria(criteria) {
    const sanitized = { ...criteria };

    Object.keys(sanitized).forEach((key) => {
      if (typeof sanitized[key] === "object" && sanitized[key] !== null) {
        if (Object.keys(sanitized[key]).length === 0) {
          delete sanitized[key];
        }
      }
    });

    return sanitized;
  }
}

module.exports = QueryBuilder;
