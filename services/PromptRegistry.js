const { mongoose } = require('../config/mongodb');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

const promptTemplateSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  name: { type: String, required: true, unique: true },
  current_version: { type: String, default: '1.0.0' },
  description: { type: String },
  category: { type: String, default: 'general' },
  metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
  is_active: { type: Boolean, default: true },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, { versionKey: false });

const promptVersionSchema = new mongoose.Schema({
  _id: { type: String, default: uuidv4 },
  template_id: { type: String, required: true, ref: 'PromptTemplate', index: true },
  version: { type: String, required: true },
  system_prompt: { type: String, default: '' },
  user_template: { type: String, default: '' },
  variables: { type: mongoose.Schema.Types.Mixed, default: [] },
  provider_config: { type: mongoose.Schema.Types.Mixed, default: {} },
  output_format: { type: String, default: 'json' },
  changelog: { type: String, default: '' },
  created_at: { type: Date, default: Date.now },
}, { versionKey: false });

promptVersionSchema.index({ template_id: 1, version: 1 });

const PromptTemplate = mongoose.models.PromptTemplate
  || mongoose.model('PromptTemplate', promptTemplateSchema, 'prompt_templates');
const PromptVersion = mongoose.models.PromptVersion
  || mongoose.model('PromptVersion', promptVersionSchema, 'prompt_versions');

class PromptRegistry {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 300000;
  }

  async create(name, definition) {
    if (typeof name === 'object') {
      const opts = name;
      name = opts.name;
      definition = { description: opts.content, systemPrompt: opts.content, ...opts };
    }
    const {
      description, systemPrompt, userTemplate, variables = [],
      provider, model, config = {}, outputFormat = 'json',
      metadata = {}, category = 'general',
      role, content,
    } = definition || {};
    const finalDescription = description || content || '';
    const finalSystemPrompt = systemPrompt || (role === 'system' ? content : '') || '';

    const templateId = uuidv4();

    await PromptTemplate.create({
      _id: templateId,
      name,
      current_version: '1.0.0',
      description: finalDescription,
      category,
      metadata: metadata || {},
    });

    await PromptVersion.create({
      template_id: templateId,
      version: '1.0.0',
      system_prompt: finalSystemPrompt,
      user_template: userTemplate,
      variables: variables || [],
      provider_config: { provider, model, ...config },
      output_format: outputFormat,
      changelog: 'Initial version',
    });

    this._invalidateCache(name);
    logger.info(`Prompt template created: ${name} v1.0.0`);
    return { name, version: '1.0.0', templateId };
  }

  async get(name) {
    const cacheKey = `prompt:${name}:latest`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    const result = await PromptTemplate.findOne({ name, is_active: true }).lean();
    if (!result) return null;

    const version = await PromptVersion.findOne({
      template_id: result._id,
      version: result.current_version
    }).lean();

    if (!version) return null;

    const template = this._formatTemplate({
      name: result.name,
      current_version: result.current_version,
      description: result.description,
      category: result.category,
      ...version,
    });

    this._setCache(cacheKey, template, this.CACHE_TTL);
    return template;
  }

  async getVersion(name, version) {
    const template = await PromptTemplate.findOne({ name }).lean();
    if (!template) return null;

    const v = await PromptVersion.findOne({
      template_id: template._id,
      version
    }).lean();

    return v ? this._formatTemplate({ ...v, name }) : null;
  }

  async createVersion(name, versionDef) {
    const { version, systemPrompt, userTemplate, changelog = '' } = versionDef;

    const template = await PromptTemplate.findOne({ name }).lean();
    if (!template) throw new Error(`Template not found: ${name}`);

    const templateId = template._id;

    const exists = await PromptVersion.findOne({
      template_id: templateId,
      version
    }).lean();
    if (exists) {
      throw new Error(`Version ${version} already exists for ${name}`);
    }

    const current = await PromptVersion.findOne({
      template_id: templateId,
      version: template.current_version
    }).lean();

    const currentConfig = current || {};

    await PromptVersion.create({
      template_id: templateId,
      version,
      system_prompt: systemPrompt,
      user_template: userTemplate,
      variables: currentConfig.variables || [],
      provider_config: currentConfig.provider_config || {},
      output_format: currentConfig.output_format || 'json',
      changelog,
    });

    await PromptTemplate.findByIdAndUpdate(templateId, {
      $set: { current_version: version, updated_at: new Date() }
    });

    this._invalidateCache(name);
    logger.info(`Prompt version created: ${name} v${version}`);
    return { name, version };
  }

  async listVersions(name) {
    const template = await PromptTemplate.findOne({ name }).lean();
    if (!template) return [];

    const versions = await PromptVersion.find({
      template_id: template._id
    })
    .sort({ created_at: -1 })
    .lean();

    return versions.map(v => ({
      version: v.version,
      changelog: v.changelog,
      created_at: v.created_at,
    }));
  }

  async rollback(name, version) {
    const template = await PromptTemplate.findOne({ name }).lean();
    if (!template) throw new Error(`Template not found: ${name}`);

    const templateId = template._id;

    const exists = await PromptVersion.findOne({
      template_id: templateId,
      version
    }).lean();
    if (!exists) throw new Error(`Version not found: ${version}`);

    await PromptTemplate.findByIdAndUpdate(templateId, {
      $set: { current_version: version, updated_at: new Date() }
    });

    this._invalidateCache(name);
    logger.info(`Prompt rolled back: ${name} → v${version}`);
    return { name, version, action: 'rollback' };
  }

  async diff(name, v1, v2) {
    const [version1, version2] = await Promise.all([
      this.getVersion(name, v1),
      this.getVersion(name, v2),
    ]);

    if (!version1 || !version2) throw new Error('Version not found');

    return {
      name,
      versions: { v1, v2 },
      systemPrompt: {
        changed: version1.systemPrompt !== version2.systemPrompt,
        v1: version1.systemPrompt,
        v2: version2.systemPrompt,
      },
      userTemplate: {
        changed: version1.userTemplate !== version2.userTemplate,
        v1: version1.userTemplate,
        v2: version2.userTemplate,
      },
      variables: {
        changed: JSON.stringify(version1.variables) !== JSON.stringify(version2.variables),
      },
      config: {
        changed: JSON.stringify(version1.providerConfig) !== JSON.stringify(version2.providerConfig),
      },
    };
  }

  async list(filters = {}) {
    const { category, isActive } = filters;
    const filter = {};

    if (category) filter.category = category;
    if (isActive !== undefined) filter.is_active = isActive;

    const docs = await PromptTemplate
      .find(filter)
      .sort({ updated_at: -1 })
      .lean();

    return docs.map(d => ({ ...d, id: d._id }));
  }

  async render(name, variables = {}) {
    const template = await this.get(name);
    if (!template) throw new Error(`Template not found: ${name}`);

    let renderedPrompt = template.userTemplate || '';
    for (const [key, value] of Object.entries(variables)) {
      renderedPrompt = renderedPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    const missingVars = (template.variables || [])
      .filter(v => v.required && variables[v.name] === undefined)
      .map(v => v.name);

    if (missingVars.length > 0) {
      throw new Error(`Missing required variables: ${missingVars.join(', ')}`);
    }

    return {
      systemPrompt: template.systemPrompt,
      userPrompt: renderedPrompt,
      config: template.providerConfig,
      outputFormat: template.outputFormat,
    };
  }

  _formatTemplate(row) {
    return {
      name: row.name,
      version: row.version || row.current_version,
      description: row.description,
      category: row.category,
      systemPrompt: row.system_prompt,
      userTemplate: row.user_template,
      variables: typeof row.variables === 'string' ? JSON.parse(row.variables) : (row.variables || []),
      providerConfig: typeof row.provider_config === 'string' ? JSON.parse(row.provider_config) : (row.provider_config || {}),
      outputFormat: row.output_format,
    };
  }

  _getCache(key) {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.CACHE_TTL) return entry.data;
    return null;
  }

  _setCache(key, data) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  _invalidateCache(name) {
    for (const [key] of this.cache) {
      if (key.includes(name)) this.cache.delete(key);
    }
  }
}

module.exports = new PromptRegistry();