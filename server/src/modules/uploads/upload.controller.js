import { PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { s3Client, bucketName, getSignedDownloadUrl } from '../../config/s3Client.js';
import Document from '../../models/Document.model.js';
import Employee from '../employees/employee.model.js';
import { writeAuditLog } from '../../utils/auditLogger.js';
import crypto from 'crypto';

/**
 * Check if the requesting user has permission to manage files for the target employee.
 * - HR_ADMIN and LEADERSHIP can manage any employee
 * - MANAGER can manage employees who report to them
 * - Any user can manage their own files
 */
const checkFilePermission = async (reqUser, targetEmployeeId) => {
  const employee = await Employee.findById(targetEmployeeId).lean();
  if (!employee) {
    return { allowed: false, employee: null, error: 'Employee not found' };
  }

  // Tenant isolation check
  if (employee.tenantId.toString() !== reqUser.tenantId.toString()) {
    return { allowed: false, employee: null, error: 'Access denied' };
  }

  // HR_ADMIN / LEADERSHIP — full access
  if (['HR_ADMIN', 'LEADERSHIP'].includes(reqUser.role)) {
    return { allowed: true, employee };
  }

  // Self — employee managing their own files
  if (employee.userId.toString() === reqUser.id.toString()) {
    return { allowed: true, employee };
  }

  // MANAGER — can manage direct reports
  if (reqUser.role === 'MANAGER') {
    const managerProfile = await Employee.findOne({ userId: reqUser.id, tenantId: reqUser.tenantId }).lean();
    if (managerProfile && employee.managerId && employee.managerId.toString() === managerProfile._id.toString()) {
      return { allowed: true, employee };
    }
  }

  return { allowed: false, employee: null, error: 'You do not have permission to manage files for this employee' };
};

/**
 * Upload profile image for an employee.
 * POST /uploads/profile-image/:employeeId
 */
export const uploadProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No image file was provided' }
      });
    }

    const { allowed, employee, error } = await checkFilePermission(req.user, req.params.employeeId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error }
      });
    }

    // Generate unique file name
    const ext = req.file.originalname.split('.').pop();
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    const s3Key = `${req.user.tenantId}/profile-images/${employee._id}/${uniqueName}`;

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));

    // Update employee profile image URL
    await Employee.findByIdAndUpdate(employee._id, { profileImageUrl: s3Key });

    // Save document record
    await Document.create({
      tenantId: req.user.tenantId,
      employeeId: employee._id,
      uploadedBy: req.user.id,
      fileName: uniqueName,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      s3Key,
      category: 'profile_image'
    });

    // Generate a pre-signed URL for immediate display
    const signedUrl = await getSignedDownloadUrl(s3Key);

    await writeAuditLog({
      action: 'PROFILE_IMAGE_UPLOADED',
      tenantId: req.user.tenantId,
      userId: req.user.id,
      targetId: employee.employeeId,
      meta: { s3Key, originalName: req.file.originalname }
    });

    res.status(200).json({
      success: true,
      message: 'Profile image uploaded successfully',
      data: {
        s3Key,
        signedUrl,
        originalName: req.file.originalname
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload a document for an employee.
 * POST /uploads/documents/:employeeId
 */
export const uploadDocumentFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: { code: 'NO_FILE', message: 'No document file was provided' }
      });
    }

    const { allowed, employee, error } = await checkFilePermission(req.user, req.params.employeeId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error }
      });
    }

    const category = req.body.category || 'other';
    const validCategories = ['id_proof', 'offer_letter', 'tax_form', 'policy', 'other'];
    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: { code: 'INVALID_CATEGORY', message: 'Invalid document category' }
      });
    }

    const ext = req.file.originalname.split('.').pop();
    const uniqueName = `${crypto.randomUUID()}.${ext}`;
    const s3Key = `${req.user.tenantId}/documents/${employee._id}/${uniqueName}`;

    // Upload to S3
    await s3Client.send(new PutObjectCommand({
      Bucket: bucketName,
      Key: s3Key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype
    }));

    const doc = await Document.create({
      tenantId: req.user.tenantId,
      employeeId: employee._id,
      uploadedBy: req.user.id,
      fileName: uniqueName,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      fileSize: req.file.size,
      s3Key,
      category
    });

    await writeAuditLog({
      action: 'DOCUMENT_UPLOADED',
      tenantId: req.user.tenantId,
      userId: req.user.id,
      targetId: employee.employeeId,
      meta: { s3Key, category, originalName: req.file.originalname }
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: doc
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List documents for an employee (with pre-signed download URLs).
 * GET /uploads/documents/:employeeId
 */
export const getDocuments = async (req, res, next) => {
  try {
    const { allowed, employee, error } = await checkFilePermission(req.user, req.params.employeeId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error }
      });
    }

    const { category } = req.query;
    const filter = { employeeId: employee._id, tenantId: req.user.tenantId };
    if (category && category !== 'all') {
      filter.category = category;
    }

    const docs = await Document.find(filter)
      .sort({ createdAt: -1 })
      .populate('uploadedBy', 'email')
      .lean();

    // Generate pre-signed URLs for each document
    const docsWithUrls = await Promise.all(
      docs.map(async (doc) => ({
        ...doc,
        signedUrl: await getSignedDownloadUrl(doc.s3Key)
      }))
    );

    res.status(200).json({
      success: true,
      data: docsWithUrls
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get a pre-signed URL for a single document.
 * GET /uploads/documents/url/:documentId
 */
export const getDocumentUrl = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.documentId,
      tenantId: req.user.tenantId
    }).lean();

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' }
      });
    }

    const signedUrl = await getSignedDownloadUrl(doc.s3Key);

    res.status(200).json({
      success: true,
      data: { signedUrl, originalName: doc.originalName, mimeType: doc.mimeType }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft-delete a document.
 * DELETE /uploads/documents/:documentId
 */
export const deleteDocument = async (req, res, next) => {
  try {
    const doc = await Document.findOne({
      _id: req.params.documentId,
      tenantId: req.user.tenantId
    });

    if (!doc) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Document not found' }
      });
    }

    // Check permission via the owning employee
    const { allowed, error } = await checkFilePermission(req.user, doc.employeeId);
    if (!allowed) {
      return res.status(403).json({
        success: false,
        error: { code: 'FORBIDDEN', message: error }
      });
    }

    doc.isDeleted = true;
    doc.deletedAt = new Date();
    await doc.save();

    await writeAuditLog({
      action: 'DOCUMENT_DELETED',
      tenantId: req.user.tenantId,
      userId: req.user.id,
      meta: { documentId: doc._id, s3Key: doc.s3Key }
    });

    res.status(200).json({
      success: true,
      message: 'Document deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get profile image URL for an employee.
 * GET /uploads/profile-image/:employeeId
 */
export const getProfileImage = async (req, res, next) => {
  try {
    const employee = await Employee.findOne({
      _id: req.params.employeeId,
      tenantId: req.user.tenantId
    }).lean();

    if (!employee) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Employee not found' }
      });
    }

    if (!employee.profileImageUrl) {
      return res.status(200).json({
        success: true,
        data: { signedUrl: null }
      });
    }

    const signedUrl = await getSignedDownloadUrl(employee.profileImageUrl);

    res.status(200).json({
      success: true,
      data: { signedUrl, s3Key: employee.profileImageUrl }
    });
  } catch (error) {
    next(error);
  }
};
