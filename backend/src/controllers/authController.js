import { authService } from '../services/authService.js';
import { successResponse, errorResponse } from '../utils/response.js';

export const register = async (req, res, next) => {
  try {
    const { email, password, fullName, businessName } = req.body;
    const result = await authService.registerUser({
      email,
      password,
      fullName,
      businessName
    });

    return successResponse(res, result, 'Account registered successfully', 201);
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required.', 400);
    }

    const result = await authService.loginUser({ email, password });
    return successResponse(res, result, 'Login successful');
  } catch (error) {
    return errorResponse(res, error.message, 401);
  }
};

export const logout = async (req, res, next) => {
  return successResponse(res, { loggedOut: true }, 'Logged out successfully');
};

export const getProfile = async (req, res, next) => {
  try {
    const profile = await authService.getUserProfile(req.user.id);
    const usage = await authService.getUserUsageStats(req.user.id);

    return successResponse(res, {
      profile: profile || req.user,
      usage
    }, 'User profile retrieved');
  } catch (error) {
    next(error);
  }
};

export const updateProfile = async (req, res, next) => {
  try {
    const { fullName, businessName } = req.body;
    const updated = await authService.updateUserProfile(req.user.id, {
      fullName,
      businessName
    });

    return successResponse(res, updated, 'Profile updated successfully');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

export const changePassword = async (req, res, next) => {
  try {
    const { newPassword } = req.body;
    await authService.changePassword(req.user.id, newPassword);

    return successResponse(res, { updated: true }, 'Password changed successfully');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email) {
      return errorResponse(res, 'Email is required.', 400);
    }
    await authService.forgotPassword(email);
    return successResponse(res, { sent: true }, 'Password reset instructions have been dispatched.');
  } catch (error) {
    return errorResponse(res, error.message, 400);
  }
};

export const deleteAccount = async (req, res, next) => {
  try {
    await authService.deleteAccount(req.user.id);
    return successResponse(res, { deleted: true }, 'Account and all associated chatbots deleted successfully');
  } catch (error) {
    next(error);
  }
};
