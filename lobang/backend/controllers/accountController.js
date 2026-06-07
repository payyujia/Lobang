const bcrypt = require('bcrypt');
const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const User = require('../models/userModel');

exports.getMe = (req,res) =>{
  if (req.session && req.session.user) {
      return res.status(200).json({ user: req.session.user });
    }
    return res.status(401).json({ message: "Not authenticated" });
}

// GET /login : Show login page
exports.loginGet = (req, res) => {
    res.json({ error: [] });
}

// POST /login : Process login
exports.loginPost = async (req, res) => {
    const email = req.body.email?.trim();
    const password = req.body.password?.trim();
    const error = [];
    if (!email) error.push('Name cannot be empty.');
    if (!password) error.push('Password cannot be empty.');

    if (error.length > 0) return res.json({ error });

    const user = await User.getByEmail(email);
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        error.push('Invalid email or password.');
        return res.json({ error });
    }
    req.session.user = { id:user._id, email: user.email, name: user.name, avatar:user.avatar };
    res.json({ user: req.session.user });
};

// GET /register : Show registration page
exports.registerGet = (req, res) => {
    res.json({ error: [] });
}

// POST /register : Process registration
exports.registerPost = async (req, res) => {
    const name = req.body.name.trim();
    const email = req.body.email.trim();
    const password = req.body.password.trim();
    const confirmPassword = req.body.confirm.trim();
    const error = [];
    if (!name) error.push('Name cannot be empty.');
    if (!email) error.push('Email cannot be empty.')
    if (!password) error.push('Password cannot be empty.');
    if (!confirmPassword) error.push('Confirm Password cannot be empty.');

    if (error.length > 0) return res.status(400).json({ error });

    if (password !== confirmPassword) {
        error.push('Passwords do not match.');
        return res.status(400).json({ error });
    }

    const existingUser = await User.getByEmail(email);
    if (existingUser) {
        error.push('Email is already in use.');
        return res.status(400).json({ error });
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    await User.create({ email, name, passwordHash});

    res.status(201).json({ message: 'Account created' });
};

//  GET /update-account 
exports.updateAccGet = async (req, res) => {
  const user = await User.findById(req.session.user.id).lean();
  res.json({ user, errors: [] });
};

//  POST /update-account
exports.updateAccPost = async (req, res) => {
  const user   = await User.findById(req.session.user.id).lean();
  const errors = [];
  const { name, email, bio, password, confirmPassword,
          locationLabel, locationLng, locationLat } = req.body;

  if (!name?.trim())  errors.push('Name cannot be empty.');
  if (!email?.trim()) errors.push('Email cannot be empty.');
  if (password && password.length < 8)          errors.push('Password must be at least 8 characters.');
  if (password && password !== confirmPassword)  errors.push('Passwords do not match.');

  if (errors.length) {
    if (req.file) fs.unlinkSync(req.file.path);
    return res.json({ user, errors });
  }

  const updates = {
    name:  name.trim(),
    email: email.trim(),
    bio:   bio?.trim(),
  };

  if (locationLat && locationLng) {
    updates.location = {
      type:        'Point',
      coordinates: [parseFloat(locationLng), parseFloat(locationLat)],
      label:       locationLabel?.trim() || '',
    };
  }

  if (req.file) {
    if (req.session.user.avatar) {
        fs.unlink(path.resolve(__dirname, '../public/uploads', req.session.user.avatar), err => {
            if (err) console.warn('Could not delete file:', req.session.user.avatar, err);
          });
    }
    updates.avatar=req.file.filename
  }

  if (password) {
    const salt = await bcrypt.genSalt(10);
    updates.passwordHash = await bcrypt.hash(password, salt);
  }

  await User.updateByEmail(user.email, updates);
  req.session.user.name = updates.name
  req.session.user.email = updates.email
  req.session.user.avatar = updates.avatar
  res.redirect(`/profile/${user._id}`);
};

// GET /logout : Log user out
exports.logout = (req, res) => {
    req.session.destroy();
    res.redirect('/login');
}