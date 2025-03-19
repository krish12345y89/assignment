import ErrorHandler from "../middlewares/error.js";
import { Task } from "../models/task.js";
import Redis from "ioredis";
import { MinPriorityQueue } from "@datastructures-js/priority-queue";
import { config } from "dotenv";

config();

// Initialize Redis connection
const redis = new Redis("redis://default:cnw73WFXEVCljxEmJ6af34Tj12H4aEM6@redis-16565.c273.us-east-1-2.ec2.redns.redis-cloud.com:16565");

const TASK_CACHE_KEY = "tasks";
const taskQueue = new MinPriorityQueue((task) => task.priority * 1000000 + task.timestamp);

redis.on("connect", () => console.log("✅ Connected to Redis Cloud"));
redis.on("error", (err) => console.error("❌ Redis Connection Error:", err));

// Function to reload queue from DB
const reloadTaskQueue = async () => {
  taskQueue.clear();
  const allTasks = await Task.find({});
  allTasks.forEach((t) => taskQueue.enqueue({ id: t._id.toString(), priority: t.priority, timestamp: t.createdAt }));
};

// Create a new task
export const newTask = async (req, res, next) => {
  try {
    const { title, description, priority = 5 ,isCompleted} = req.body;
    if (!title || !description) {
      return next(new ErrorHandler("Please provide both title and description", 400));
    }

    const task = await Task.create({
      title,
      description,
      isCompleted,
      priority,
      user: req.user,
      createdAt: Date.now(),
    });

    taskQueue.enqueue({ id: task._id.toString(), priority: task.priority, timestamp: task.createdAt });

    // Invalidate user cache
    const userCacheKeyPattern = `${TASK_CACHE_KEY}:${req.user._id}:*`;
    const keysToDelete = await redis.keys(userCacheKeyPattern);
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }

    res.status(201).json({
      success: true,
      message: "Task added successfully",
    });
  } catch (error) {
    next(error);
  }
};

// Get tasks with caching and priority sorting
export const getMyTask = async (req, res, next) => {
  try {
    const userId = req.user._id;
    let { page = 1, limit = 10, isCompleted } = req.query;
    page = parseInt(page) || 1;
    limit = parseInt(limit) || 10;
    const skip = (page - 1) * limit;

    const cacheKey = `${TASK_CACHE_KEY}:${userId}:page=${page}:limit=${limit}:completed=${isCompleted}`;
    const cachedTasks = await redis.get(cacheKey);

    if (cachedTasks) {
      return res.status(200).json({
        success: true,
        tasks: JSON.parse(cachedTasks),
        fromCache: true,
      });
    }

    // Build query object for filtering
    const query = { user: userId };
    if (isCompleted !== undefined) {
      query.isCompleted = isCompleted === "true";
    }

    // Get sorted tasks from DB
    const tasks = await Task.find(query)
      .sort({ priority: -1, createdAt: -1 }) 
      .skip(skip)
      .limit(limit);

    await redis.set(cacheKey, JSON.stringify(tasks), "EX", 600);

    res.status(200).json({ success: true, tasks });
  } catch (error) {
    next(error);
  }
};

// Update task status
// Update task
export const updateTask = async (req, res, next) => {
  try {
    const { title, description, priority, isCompleted } = req.body;

    if (title === undefined && description === undefined && priority === undefined && isCompleted === undefined) {
      return next(new ErrorHandler("Please provide at least one field to update", 400));
    }

    // Find task by ID
    const task = await Task.findById(req.params.id);
    if (!task) return next(new ErrorHandler("Task not found", 404));

    // Prepare update data
    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (priority !== undefined) updateData.priority = priority;
    if (isCompleted !== undefined) updateData.isCompleted = isCompleted;

    // Update task
    await Task.findByIdAndUpdate(req.params.id, { $set: updateData });

    // Reload task queue
    await reloadTaskQueue();

    // Invalidate cache for this user
    const userCacheKeyPattern = `${TASK_CACHE_KEY}:${task.user}:*`;
    const keysToDelete = await redis.keys(userCacheKeyPattern);
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }

    res.status(200).json({ success: true, message: "Task updated successfully" });
  } catch (error) {
    next(error);
  }
};


// Delete a task
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return next(new ErrorHandler("Task not found", 404));

    await task.deleteOne();

    await reloadTaskQueue();

    const userCacheKeyPattern = `${TASK_CACHE_KEY}:${task.user}:*`;
    const keysToDelete = await redis.keys(userCacheKeyPattern);
    if (keysToDelete.length > 0) {
      await redis.del(...keysToDelete);
    }

    res.status(200).json({ success: true, message: "Task deleted successfully" });
  } catch (error) {
    next(error);
  }
};
