const { query } = require('../config/database');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');

/**
 * PromptRegistry - Versioned prompt template management
 * Part of LLM & Prompt Management skill
 */
class PromptRegistry {
  constructor() {
    this.cache = new Map();
    this.CACHE_TTL = 300000; // 5 min
  }

  /**
   * Create a new prompt template
   * @param {string} name - Template name
   * @param {object} definition - Template definition
   * @returns {Promise<object>}
   */
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

    await query(
      `INSERT INTO prompt_templates (id, name, current_version, description, category, metadata)
       VALUES ($1, $2, '1.0.0', $3, $4, $5)`,
      [templateId, name, finalDescription, category, JSON.stringify(metadata)]
    );

    await query(
      `INSERT INTO prompt_versions (template_id, version, system_prompt, user_template, 
        variables, provider_config, output_format, changelog)
       VALUES ($1, '1.0.0', $2, $3, $4, $5, $6, 'Initial version')`,
      [templateId, finalSystemPrompt, userTemplate, JSON.stringify(variables),
       JSON.stringify({ provider, model, ...config }), outputFormat]
    );

    this._invalidateCache(name);
    logger.info(`Prompt template created: ${name} v1.0.0`);
    return { name, version: '1.0.0', templateId };
  }

  /**
   * Get the latest version of a prompt template
   * @param {string} name - Template name
   * @returns {Promise<object|null>}
   */
  async get(name) {
    const cacheKey = `prompt:${name}:latest`;
    const cached = this._getCache(cacheKey);
    if (cached) return cached;

    const result = await query(
      `SELECT pt.name, pt.current_version, pt.description, pt.category,
              pv.system_prompt, pv.user_template, pv.variables, 
              pv.provider_config, pv.output_format
       FROM prompt_templates pt
       JOIN prompt_versions pv ON pv.template_id = pt.id AND pv.version = pt.current_version
       WHERE pt.name = $1 AND pt.is_active = true`,
      [name]
    );

    if (result.rows.length === 0) return null;

    const template = this._formatTemplate(result.rows[0]);
    this._setCache(cacheKey, template, this.CACHE_TTL);
    return template;
  }

  /**
   * Get a specific version of a prompt
   * @param {string} name - Template name
   * @param {string} version - Version string
   * @returns {Promise<object|null>}
   */
  async getVersion(name, version) {
    const result = await query(
      `SELECT pt.name, pv.version, pt.description,
              pv.system_prompt, pv.user_template, pv.variables,
              pv.provider_config, pv.output_format, pv.changelog
       FROM prompt_templates pt
       JOIN prompt_versions pv ON pv.template_id = pt.id
       WHERE pt.name = $1 AND pv.version = $2`,
      [name, version]
    );

    return result.rows[0] ? this._formatTemplate(result.rows[0]) : null;
  }

  /**
   * Create a new version of a prompt
   * @param {string} name - Template name
   * @param {object} versionDef - Version definition
   * @returns {Promise<object>}
   */
  async createVersion(name, versionDef) {
    const { version, systemPrompt, userTemplate, changelog = '' } = versionDef;

    const templateResult = await query(
      'SELECT id FROM prompt_templates WHERE name = $1', [name]
    );
    if (templateResult.rows.length === 0) throw new Error(`Template not found: ${name}`);

    const templateId = templateResult.rows[0].id;

    // Check version doesn't exist
    const existing = await query(
      'SELECT id FROM prompt_versions WHERE template_id = $1 AND version = $2',
      [templateId, version]
    );
    if (existing.rows.length > 0) {
      throw new Error(`Version ${version} already exists for ${name}`);
    }

    // Get current version config
    const current = await query(
      `SELECT variables, provider_config, output_format FROM prompt_versions 
       WHERE template_id = $1 AND version = (SELECT current_version FROM prompt_templates WHERE id = $1)`,
      [templateId]
    );

    const currentConfig = current.rows[0] || {};

    await query(
      `INSERT INTO prompt_versions (template_id, version, system_prompt, user_template,
        variables, provider_config, output_format, changelog)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [templateId, version, systemPrompt, userTemplate,
       JSON.stringify(currentConfig.variables || []),
       JSON.stringify(currentConfig.provider_config || {}),
       currentConfig.output_format || 'json', changelog]
    );

    await query(
      `UPDATE prompt_templates SET current_version = $1, updated_at = NOW() WHERE id = $2`,
      [version, templateId]
    );

    this._invalidateCache(name);
    logger.info(`Prompt version created: ${name} v${version}`);
    return { name, version };
  }

  /**
   * List all versions of a prompt
   * @param {string} name - Template name
   * @returns {Promise<Array>}
   */
  async listVersions(name) {
    const result = await query(
      `SELECT pv.version, pv.changelog, pv.created_at
       FROM prompt_versions pv
       JOIN prompt_templates pt ON pt.id = pv.template_id
       WHERE pt.name = $1
       ORDER BY pv.created_at DESC`,
      [name]
    );
    return result.rows;
  }

  /**
   * Rollback to a previous version
   * @param {string} name - Template name
   * @param {string} version - Target version
   * @returns {Promise<object>}
   */
  async rollback(name, version) {
    const templateResult = await query(
      'SELECT id FROM prompt_templates WHERE name = $1', [name]
    );
    if (templateResult.rows.length === 0) throw new Error(`Template not found: ${name}`);

    const templateId = templateResult.rows[0].id;

    const versionResult = await query(
      'SELECT version FROM prompt_versions WHERE template_id = $1 AND version = $2',
      [templateId, version]
    );
    if (versionResult.rows.length === 0) throw new Error(`Version not found: ${version}`);

    await query(
      `UPDATE prompt_templates SET current_version = $1, updated_at = NOW() WHERE id = $2`,
      [version, templateId]
    );

    this._invalidateCache(name);
    logger.info(`Prompt rolled back: ${name} → v${version}`);
    return { name, version, action: 'rollback' };
  }

  /**
   * Diff two versions of a prompt
   * @param {string} name - Template name
   * @param {string} v1 - First version
   * @param {string} v2 - Second version
   * @returns {Promise<object>}
   */
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

  /**
   * List all prompt templates
   * @param {object} filters - Filter options
   * @returns {Promise<Array>}
   */
  async list(filters = {}) {
    const { category, isActive } = filters;
    let sql = 'SELECT id, name, current_version, description, category, created_at FROM prompt_templates WHERE 1=1';
    const params = [];
    let idx = 1;

    if (category) { sql += ` AND category = $${idx}`; params.push(category); idx++; }
    if (isActive !== undefined) {
      sql += ` AND is_active = $${idx}`; params.push(isActive); idx++;
    }

    sql += ' ORDER BY updated_at DESC';
    const result = await query(sql, params);
    return result.rows;
  }

  /**
   * Render a prompt with variables
   * @param {string} name - Template name
   * @param {object} variables - Variable values
   * @returns {Promise<object>}
   */
  async render(name, variables = {}) {
    const template = await this.get(name);
    if (!template) throw new Error(`Template not found: ${name}`);

    let renderedPrompt = template.userTemplate;
    for (const [key, value] of Object.entries(variables)) {
      renderedPrompt = renderedPrompt.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    }

    const missingVars = template.variables
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
