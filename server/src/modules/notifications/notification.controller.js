import Notification from '../../models/Notification.model.js';

/**
 * Fetch all notifications for the logged in user, sorted by most recent
 * GET /api/notifications
 */
export const getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find({
      userId: req.user.id,
      tenantId: req.user.tenantId
    })
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a single notification as read
 * PUT /api/notifications/:id/read
 */
export const markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
        tenantId: req.user.tenantId
      },
      { read: true },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' }
      });
    }

    res.status(200).json({
      success: true,
      data: notification
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all notifications for the logged in user as read
 * PUT /api/notifications/read-all
 */
export const markAllAsRead = async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        userId: req.user.id,
        tenantId: req.user.tenantId,
        read: false
      },
      { read: true }
    );

    res.status(200).json({
      success: true,
      message: 'All notifications marked as read'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Soft-delete a notification
 * DELETE /api/notifications/:id
 */
export const deleteNotification = async (req, res, next) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      {
        _id: req.params.id,
        userId: req.user.id,
        tenantId: req.user.tenantId
      },
      {
        isDeleted: true,
        deletedAt: new Date()
      },
      { new: true }
    );

    if (!notification) {
      return res.status(404).json({
        success: false,
        error: { code: 'NOT_FOUND', message: 'Notification not found' }
      });
    }

    res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};
