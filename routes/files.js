const express = require('express');
const path = require('path');
const fs = require('fs/promises');
const logger = require('../config/logger');
const { authMiddleware } = require('../middleware/auth');
const File = require('../models/File');

const router = express.Router();

router.post('/', authMiddleware, async (req, res) => {
  try {
    const { filename, content, conversationId } = req.body;
    if (!filename || content === undefined) {
      return res.status(400).json({ error: 'filename and content are required' });
    }

    const storageDir = path.join(__dirname, '..', 'storage', 'files', req.user.id, conversationId || 'general');
    await fs.mkdir(storageDir, { recursive: true });

    const storagePath = path.join(storageDir, filename);
    await fs.writeFile(storagePath, content, 'utf8');

    const stat = await fs.stat(storagePath);
    const mimeType = require('mime-types').lookup(filename) || 'application/octet-stream';

    const file = await File.create(
      req.user.id,
      conversationId || null,
      filename,
      mimeType,
      stat.size,
      storagePath
    );

    logger.info('File created', { fileId: file.id, filename, userId: req.user.id });
    res.status(201).json({
      data: {
        id: file.id,
        filename: file.filename,
        mime_type: file.mime_type,
        size_bytes: file.size_bytes,
        created_at: file.created_at,
        download_url: `/api/files/${file.id}/download`,
      },
    });
  } catch (err) {
    logger.error('File creation failed', { error: err.message });
    res.status(500).json({ error: 'Failed to create file' });
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { conversation_id } = req.query;
    let files;
    if (conversation_id) {
      files = await File.findByConversation(conversation_id);
    } else {
      files = await File.findByUser(req.user.id);
    }
    res.json({ data: files });
  } catch (err) {
    logger.error('File listing failed', { error: err.message });
    res.status(500).json({ error: 'Failed to list files' });
  }
});

router.get('/:id/download', authMiddleware, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const exists = await fs.stat(file.storage_path).then(() => true).catch(() => false);
    if (!exists) return res.status(404).json({ error: 'File not found on disk' });

    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Disposition', `attachment; filename="${file.filename}"`);
    res.sendFile(file.storage_path);
  } catch (err) {
    logger.error('File download failed', { error: err.message });
    res.status(500).json({ error: 'Failed to download file' });
  }
});

router.get('/:id/content', authMiddleware, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const exists = await fs.stat(file.storage_path).then(() => true).catch(() => false);
    if (!exists) return res.status(404).json({ error: 'File not found on disk' });

    const content = await fs.readFile(file.storage_path, 'utf8');
    res.json({ data: { id: file.id, filename: file.filename, content, size_bytes: file.size_bytes, mime_type: file.mime_type } });
  } catch (err) {
    logger.error('File content read failed', { error: err.message });
    res.status(500).json({ error: 'Failed to read file content' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ error: 'File not found' });
    if (file.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await fs.unlink(file.storage_path).catch(() => {});
    await File.delete(req.params.id);

    logger.info('File deleted', { fileId: req.params.id, userId: req.user.id });
    res.json({ data: { deleted: true } });
  } catch (err) {
    logger.error('File deletion failed', { error: err.message });
    res.status(500).json({ error: 'Failed to delete file' });
  }
});

module.exports = router;
