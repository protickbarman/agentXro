const Joi = require('joi');

// User validation schemas
const userRegistrationSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  username: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(3).max(30),
});

const userLoginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

const profileUpdateSchema = Joi.object({
  username: Joi.string().pattern(/^[a-zA-Z0-9_-]+$/).min(3).max(30),
  email: Joi.string().email(),
}).min(1);

const passwordChangeSchema = Joi.object({
  currentPassword: Joi.string().required(),
  newPassword: Joi.string().min(8).required(),
});

const sessionIdSchema = Joi.object({
  sessionId: Joi.string().uuid().required(),
});

// Conversation validation schemas
const conversationCreateSchema = Joi.object({
  title: Joi.string().min(1).max(255).required(),
  description: Joi.string().max(1000),
});

const conversationUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(255),
  description: Joi.string().max(1000),
}).min(1);

// Message validation schemas
const messageCreateSchema = Joi.object({
  conversationId: Joi.string().uuid().required(),
  content: Joi.string().min(1).max(10000).required(),
});

// AI chat schema
const aiChatSchema = Joi.object({
  message: Joi.string().min(1).max(10000).required(),
  conversationId: Joi.string().uuid().optional(),
});

// Query parameters schemas
const paginationSchema = Joi.object({
  limit: Joi.number().integer().min(1).max(100).default(20),
  offset: Joi.number().integer().min(0).default(0),
});

/**
 * Validate data against schema
 * @param {object} data - Data to validate
 * @param {Joi.Schema} schema - Joi schema
 * @returns {object} { value, error }
 */
function validate(data, schema) {
  return schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });
}

/**
 * Validate and throw error if invalid
 * @param {object} data - Data to validate
 * @param {Joi.Schema} schema - Joi schema
 * @throws {Error} If validation fails
 */
function validateOrThrow(data, schema) {
  const { error, value } = validate(data, schema);
  if (error) {
    const messages = error.details.map(d => d.message).join(', ');
    const err = new Error(`Validation error: ${messages}`);
    err.status = 422;
    throw err;
  }
  return value;
}

module.exports = {
  validate,
  validateOrThrow,
  schemas: {
    userRegistrationSchema,
    userLoginSchema,
    profileUpdateSchema,
    passwordChangeSchema,
    sessionIdSchema,
    conversationCreateSchema,
    conversationUpdateSchema,
    messageCreateSchema,
    aiChatSchema,
    paginationSchema,
  },
};
