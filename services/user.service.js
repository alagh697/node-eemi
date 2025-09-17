const User = require('../models/user.model');

const createUser = async (userData) => {
  return await User.create(userData);
};

const getAllUsers = async () => {
  return await User.find();
};

module.exports = { createUser, getAllUsers };
