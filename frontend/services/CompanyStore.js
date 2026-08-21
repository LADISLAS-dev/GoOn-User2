const COMPANIES = [];
const MESSAGES = [];
const APPOINTMENTS = [];

const generateId = () =>
  `${Date.now()}-${Math.random().toString(16).slice(2)}`;

export const CompanyStore = {

  // COMPANY
  createCompany(data) {
    const company = {
      id: generateId(),
      ...data,
      createdAt: new Date(),
      services: [],
    };
    COMPANIES.push(company);
    return company;
  },

  updateCompany(company) {
    const index = COMPANIES.findIndex(
      c =>
        c.id === company.id ||
        c._id === company.id ||
        c.id === company._id ||
        c._id === company._id
    );

    if (index === -1) {
      return null;
    }

    const nextCompany = {
      ...COMPANIES[index],
      ...company,
    };

    if (!nextCompany.id && nextCompany._id) {
      nextCompany.id = nextCompany._id;
    }

    if (!nextCompany._id && nextCompany.id) {
      nextCompany._id = nextCompany.id;
    }

    COMPANIES[index] = nextCompany;
    return COMPANIES[index];
  },

  getByCategory(categoryId) {
    return COMPANIES.filter(c => c.categoryId === categoryId);
  },

  getById(id) {
    return COMPANIES.find(c => c.id === id);
  },

  // MESSAGES (isolé par companyId)
  addMessage({ companyId, senderId, text }) {
    const msg = {
      id: generateId(),
      companyId,
      senderId,
      text,
      createdAt: new Date(),
    };
    MESSAGES.push(msg);
    return msg;
  },

  getMessages(companyId) {
    return MESSAGES.filter(m => m.companyId === companyId);
  },

  // APPOINTMENTS
  addAppointment(data) {
    const appt = {
      id: generateId(),
      ...data,
      createdAt: new Date(),
    };
    APPOINTMENTS.push(appt);
    return appt;
  },

  getAppointments(companyId) {
    return APPOINTMENTS.filter(a => a.companyId === companyId);
  },
};