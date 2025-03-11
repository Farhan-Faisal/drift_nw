import { Request, Response } from 'express';
import { User } from '../models/User';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export const register = async (req: Request, res: Response) => {
  try {
    const { name, password } = req.body;
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);
    
    const user = new User({
      name,
      user_id: uuidv4(),
      password: hashedPassword
    });

    await user.save();

    const userResponse = {
      name: user.name,
      user_id: user.user_id,
      _id: user._id
    };

    res.status(201).json({
      success: true,
      data: userResponse
    });

  } catch (error: any) {
    if (error.code === 11000) { // MongoDB duplicate key error code
      return res.status(400).json({
        success: false,
        error: 'A user with this name already exists'
      });
    }
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create user'
    });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { name, password } = req.body;

    // Find user by name
    const user = await User.findOne({ name });
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials'
      });
    }

    // Return user data
    res.status(200).json({
      success: true,
      data: {
        name: user.name,
        user_id: user.user_id
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to login'
    });
  }
};

export const deleteAllUsers = async (req: Request, res: Response) => {
  try {
    await User.deleteMany({});
    res.status(200).json({
      success: true,
      message: 'All users deleted successfully'
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete users'
    });
  }
};

export const getUserByName = async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const user = await User.findOne({ name: username });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user_id: user.user_id
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get user'
    });
  }
}; 